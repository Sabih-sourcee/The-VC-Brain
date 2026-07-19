/**
 * LangGraph orchestration for the inbound VC analysis pipeline.
 *
 * Graph:
 *   START → memory_check
 *             ├─(insufficient)→ sourcing → memory_write → assess → END
 *             └─(sufficient)──→ gap_fill_sourcing → memory_write → assess → END
 *
 * Invoked only from runAnalysis (serverFn). Do not import from client code.
 *
 * Model: gpt-4o-mini (cost/speed for multi-step Tavily + validator loops).
 * Tavily: @langchain/tavily TavilySearch (modern successor to community's
 * TavilySearchResults — @langchain/community could not install cleanly due to
 * a zod peer conflict with stagehand).
 */
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearch } from "@langchain/tavily";
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";

// ---------- Shared types (must match prior RunAnalysisResult contract) ----------

export type AgentTrace = { agent: string; step: string; detail?: string };

export type ThesisInput = {
  sectors: string[];
  stage: string;
  geography: string;
  checkMin: number;
  checkMax: number;
  ownership: number;
  risk: string;
};

export type AnalysisInput = {
  vcName: string;
  company: string;
  founder: string;
  url: string;
  deckText: string;
  thesis: ThesisInput;
};

export type TavilyResult = { title: string; url: string; content: string; score?: number };
export type TavilySearchOutcome =
  | { ok: true; query: string; results: TavilyResult[]; answer?: string }
  | { ok: false; query: string; error: string; status?: number };

export type PriorMemoryRow = {
  topic: string;
  summary: string;
  evidence_urls: string[] | null;
  updated_at: string;
};

export const AssessmentSchema = z.object({
  recommendation: z.enum(["recommend", "diligence", "pass"]),
  thesisFit: z.boolean(),
  thesisFitNote: z.string(),
  founderScore: z.number(),
  founderBlurb: z.string(),
  companyReputationScore: z.number(),
  riskScore: z.number(),
  shouldInvest: z.boolean(),
  snapshot: z.string(),
  hypotheses: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  opportunities: z.array(z.string()),
  risks: z.array(z.string()),
  claims: z.array(
    z.object({
      text: z.string(),
      trust: z.enum(["verified", "unverified", "contradicted"]),
      evidence: z.string(),
      evidenceUrl: z.string(),
    }),
  ),
  gaps: z.array(z.string()),
  problemAndProduct: z.string(),
  tractionKPIs: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      disclosed: z.boolean(),
    }),
  ),
  axes: z.object({
    founder: z.object({
      score: z.number(),
      trend: z.enum(["improving", "stable", "declining"]),
      rationale: z.string(),
    }),
    market: z.object({
      score: z.number(),
      stance: z.enum(["bullish", "neutral", "bear"]),
      trend: z.enum(["improving", "stable", "declining"]),
      rationale: z.string(),
    }),
    ideaVsMarket: z.object({
      score: z.number(),
      survivesAsIs: z.boolean(),
      trend: z.enum(["improving", "stable", "declining"]),
      rationale: z.string(),
    }),
  }),
  disagreement: z.string(),
});

export type Assessment = z.infer<typeof AssessmentSchema>;

export type AnalysisResult = {
  company: string;
  founder: string;
  trace: AgentTrace[];
  priorMemoryUsed: PriorMemoryRow[];
  sourcingRaw: string;
  tavilyRuns: TavilySearchOutcome[];
  assessment: Assessment | null;
  coldStart: { active: boolean; confidence: number; note: string };
  founderScoreHistory: number[];
  priorFounderScore: number | null;
  memory: { ragChunks: number; topSimilarity: number; sufficient: boolean };
};

// ---------- Graph state ----------

const GraphState = Annotation.Root({
  input: Annotation<AnalysisInput>,
  trace: Annotation<AgentTrace[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  priorMemoryUsed: Annotation<PriorMemoryRow[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  priorContext: Annotation<string>({ reducer: (_a, b) => b, default: () => "(no prior notes)" }),
  ragContext: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  ragChunks: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  ragTopSimilarity: Annotation<number>({ reducer: (_a, b) => b, default: () => 0 }),
  memorySufficient: Annotation<boolean>({ reducer: (_a, b) => b, default: () => false }),
  founderId: Annotation<string | null>({ reducer: (_a, b) => b, default: () => null }),
  priorFounderScore: Annotation<number | null>({ reducer: (_a, b) => b, default: () => null }),
  tavilyRuns: Annotation<TavilySearchOutcome[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  sourcingRaw: Annotation<string>({ reducer: (_a, b) => b, default: () => "" }),
  coldStart: Annotation<boolean>({ reducer: (_a, b) => b, default: () => false }),
  coldStartConfidence: Annotation<number>({ reducer: (_a, b) => b, default: () => 1 }),
  assessment: Annotation<Assessment | null>({ reducer: (_a, b) => b, default: () => null }),
  founderScoreHistory: Annotation<number[]>({ reducer: (_a, b) => b, default: () => [] }),
});

type State = typeof GraphState.State;

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function chat(temperature = 0.2) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return new ChatOpenAI({ model: "gpt-4o-mini", temperature, apiKey });
}

/** Invoke LangChain TavilySearch and normalize to our TavilySearchOutcome shape. */
async function tavilySearch(
  query: string,
  opts: { maxResults?: number; includeDomains?: string[] } = {},
): Promise<TavilySearchOutcome> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { ok: false, query, error: "TAVILY_API_KEY not configured" };
  try {
    const tool = new TavilySearch({
      maxResults: opts.maxResults ?? 5,
      includeAnswer: true,
      searchDepth: "basic",
      tavilyApiKey: apiKey,
      ...(opts.includeDomains?.length ? { includeDomains: opts.includeDomains } : {}),
    });
    const raw = await tool.invoke({
      query,
      ...(opts.includeDomains?.length ? { includeDomains: opts.includeDomains } : {}),
    });
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const resultsSrc = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.results)
        ? parsed.results
        : [];
    const results: TavilyResult[] = resultsSrc.map((r: Record<string, unknown>) => ({
      title: String(r.title ?? ""),
      url: String(r.url ?? ""),
      content: String(r.content ?? r.snippet ?? "").slice(0, 800),
      score: typeof r.score === "number" ? r.score : undefined,
    }));
    const answer =
      typeof parsed?.answer === "string"
        ? parsed.answer
        : typeof parsed === "object" && !Array.isArray(parsed) && typeof (parsed as { answer?: string }).answer === "string"
          ? (parsed as { answer: string }).answer
          : undefined;
    return { ok: true, query, results, answer };
  } catch (e) {
    return { ok: false, query, error: `Tavily error: ${(e as Error).message}` };
  }
}

// ---------- Node: memory_check ----------

async function memoryCheckNode(state: State): Promise<Partial<State>> {
  const data = state.input;
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  const { retrieveMemory } = await import("./rag.server");
  const out: Partial<State> = { trace: [] };
  const t = (agent: string, step: string, detail?: string) => {
    (out.trace as AgentTrace[]).push({ agent, step, detail });
  };

  t("memory", "recall", `${data.vcName}.md · DB lookup`);
  const memoryQuery = await supabaseAdmin
    .from("vc_memory")
    .select("topic, summary, evidence_urls, updated_at")
    .eq("vc_name", data.vcName)
    .order("updated_at", { ascending: false })
    .limit(50);
  const allNotes = (memoryQuery.data ?? []) as PriorMemoryRow[];
  const needle = normalizeName(data.company);
  const sectorNeedles = data.thesis.sectors.map((s) => s.toLowerCase());
  const relevantMemory = allNotes.filter((m) => {
    const topic = m.topic.toLowerCase();
    return (
      topic === needle ||
      topic.includes(needle) ||
      needle.includes(topic) ||
      sectorNeedles.some((s) => topic.includes(s))
    );
  });
  out.priorMemoryUsed = relevantMemory;
  out.priorContext =
    relevantMemory.length > 0
      ? relevantMemory.map((m) => `- [${m.topic}] ${m.summary}`).join("\n")
      : "(no prior notes)";
  t("memory", relevantMemory.length ? "hit" : "miss", `${relevantMemory.length} prior notes`);

  const memoryQueryText = [data.company, data.founder, data.thesis.sectors.join(" "), data.url]
    .filter(Boolean)
    .join(" — ");
  let ragChunks: Awaited<ReturnType<typeof retrieveMemory>>["chunks"] = [];
  let ragTopSimilarity = 0;
  try {
    const rag = await retrieveMemory({
      vcName: data.vcName,
      company: data.company,
      queryText: memoryQueryText,
      k: 6,
    });
    ragChunks = rag.chunks;
    ragTopSimilarity = rag.topSimilarity;
    t(
      "memory",
      ragChunks.length ? "rag:hit" : "rag:miss",
      `${ragChunks.length} chunks · top sim ${ragTopSimilarity.toFixed(2)}`,
    );
  } catch (e) {
    t("memory", "rag:error", (e as Error).message);
  }

  const memorySufficient = ragChunks.length >= 4 && ragTopSimilarity >= 0.82;
  out.ragChunks = ragChunks.length;
  out.ragTopSimilarity = ragTopSimilarity;
  out.memorySufficient = memorySufficient;
  out.ragContext = ragChunks.length
    ? ragChunks.map((c, i) => `[mem ${i + 1} · sim ${c.similarity.toFixed(2)}] ${c.content}`).join("\n")
    : "";
  t(
    "memory",
    memorySufficient ? "decision:sufficient" : "decision:gap",
    memorySufficient
      ? "memory fresh — Sourcing will only gap-fill"
      : "memory thin/stale — running full Sourcing",
  );

  if (data.founder) {
    const normFounder = normalizeName(data.founder);
    const upsert = await supabaseAdmin
      .from("founders")
      .upsert({ name: data.founder, normalized_name: normFounder }, { onConflict: "normalized_name" })
      .select("id")
      .maybeSingle();
    out.founderId = upsert.data?.id ?? null;
    if (out.founderId) {
      const prev = await supabaseAdmin
        .from("founder_scores")
        .select("score")
        .eq("founder_id", out.founderId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      out.priorFounderScore = prev.data?.score != null ? Number(prev.data.score) : null;
      t(
        "memory",
        out.priorFounderScore != null ? "founder:known" : "founder:new",
        out.priorFounderScore != null
          ? `prior founder score ${out.priorFounderScore}/100`
          : `cold-start candidate ${data.founder}`,
      );
    }
  }

  return out;
}

// ---------- Shared sourcing body (full vs gap-fill) ----------

async function runSourcing(state: State, mode: "full" | "gap-fill"): Promise<Partial<State>> {
  const data = state.input;
  const traces: AgentTrace[] = [];
  const t = (agent: string, step: string, detail?: string) => traces.push({ agent, step, detail });
  const tavilyRuns: TavilySearchOutcome[] = [];

  t("sourcing", "start", "running targeted Tavily searches");

  const sectorHint = data.thesis.sectors.slice(0, 2).join(" ");
  const fullQueries: string[] = [
    `${data.company} company overview`,
    `${data.company} reviews complaints`,
    `${data.company} reddit`,
    ...(data.founder ? [`${data.founder} founder background`] : []),
    ...(data.url ? [`${data.url} site review`] : []),
    ...(sectorHint ? [`${data.company} ${sectorHint} traction funding`] : []),
  ];
  const gapQueries: string[] = [
    `${data.company} latest news`,
    ...(sectorHint ? [`${data.company} ${sectorHint} funding 2026`] : []),
  ];
  const plannedQueries = mode === "gap-fill" ? gapQueries : fullQueries;
  t("sourcing", mode === "gap-fill" ? "mode:gap-fill" : "mode:full", `${plannedQueries.length} planned queries`);

  for (const q of plannedQueries) {
    const outcome = await tavilySearch(q, { maxResults: 5 });
    tavilyRuns.push(outcome);
    if (outcome.ok) {
      t(
        "sourcing",
        outcome.results.length ? "tavily:results" : "tavily:empty",
        `${outcome.results.length} hits · ${q}`,
      );
    } else {
      console.error("[sourcing] tavily error", outcome);
      t("sourcing", "tavily:error", `${outcome.error} · ${q}`);
    }
  }

  // Cold-start footprint (same gate as before)
  const totalHits = tavilyRuns.reduce((n, r) => n + (r.ok ? r.results.length : 0), 0);
  const founderHits = tavilyRuns
    .filter((r) => r.ok && r.query.toLowerCase().includes(normalizeName(data.founder || "")))
    .reduce((n, r) => n + (r.ok ? r.results.length : 0), 0);
  let coldStart = !!data.founder && (totalHits < 6 || founderHits < 2);
  let coldStartConfidence = 1.0;
  if (coldStart) {
    t("sourcing", "cold-start:on", `only ${totalHits} total hits, ${founderHits} on founder`);
    const footprintQueries: Array<{ q: string; domains?: string[] }> = data.founder
      ? [
          { q: `${data.founder} linkedin`, domains: ["linkedin.com"] },
          { q: `${data.founder} twitter OR x.com`, domains: ["twitter.com", "x.com"] },
          { q: `${data.founder} github`, domains: ["github.com"] },
          { q: `${data.founder} interview OR podcast OR talk` },
        ]
      : [];
    for (const { q, domains } of footprintQueries) {
      const outcome = await tavilySearch(q, { maxResults: 4, includeDomains: domains });
      tavilyRuns.push(outcome);
      if (outcome.ok) {
        t(
          "sourcing",
          outcome.results.length ? "cold-start:hit" : "cold-start:miss",
          `${outcome.results.length} · ${q}`,
        );
      } else {
        t("sourcing", "cold-start:error", `${outcome.error} · ${q}`);
      }
    }
    const coldHits = tavilyRuns
      .slice(-footprintQueries.length)
      .reduce((n, r) => n + (r.ok ? r.results.length : 0), 0);
    coldStartConfidence = Math.min(0.8, 0.4 + coldHits * 0.1);
  }

  const evidenceBlock = tavilyRuns
    .map((r) => {
      if (!r.ok) return `QUERY: ${r.query}\nERROR: ${r.error}`;
      if (r.results.length === 0) return `QUERY: ${r.query}\nNO RESULTS`;
      return [
        `QUERY: ${r.query}`,
        r.answer ? `TAVILY_ANSWER: ${r.answer}` : "",
        ...r.results.map((x, i) => `[${i + 1}] ${x.title}\nURL: ${x.url}\nSNIPPET: ${x.content}`),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  const deckBlock = data.deckText
    ? `\n\n=== PITCH DECK CONTENT (uploaded by founder) ===\n${data.deckText.slice(0, 8000)}`
    : "";
  if (data.deckText) t("sourcing", "deck:ingested", `${data.deckText.length} chars from PDF`);

  // LLM + bound Tavily tool for follow-up verification (max ~4 tool rounds)
  const tavilyTool = new TavilySearch({
    maxResults: 5,
    includeAnswer: true,
    searchDepth: "basic",
    tavilyApiKey: process.env.TAVILY_API_KEY,
    name: "tavily_search",
    description:
      "Search the live web via Tavily. Use for follow-up verification of specific claims. Returns title/url/snippet.",
  });
  const llm = chat().bindTools([tavilyTool]);
  const systemParts = [
    "You are the Sourcing Agent for a VC firm.",
    "You have been given REAL web search results from Tavily below. Ground every statement in those snippets.",
    "You may call tavily_search to verify specific additional claims (max 4 follow-up searches).",
    "If evidence for a claim is absent from all results, say 'no evidence found' — do NOT invent facts.",
    "Output a factual dump organized as: Company Overview, Founder Signals, Reputation & Reviews, Traction/Funding, Red Flags. Cite [url] inline.",
    data.deckText
      ? "A pitch deck was uploaded — extract self-reported claims (traction, KPIs, team) and mark them separately from externally verified facts."
      : "",
    coldStart
      ? "This is a COLD-START founder (little public track record). Lean on the LinkedIn / Twitter / GitHub / interview snippets to extract signal, but explicitly mark low-confidence claims."
      : "",
    state.priorContext !== "(no prior notes)"
      ? `Prior notes from ${data.vcName}:\n${state.priorContext}`
      : "No prior notes exist for this VC.",
    state.ragContext
      ? `RETRIEVED MEMORY (semantic recall of prior research — reuse it, do NOT re-derive what's already here; focus new searches on gaps):\n${state.ragContext}`
      : "",
  ].filter(Boolean);

  const humanPrompt = [
    `Company: ${data.company}`,
    `Founder: ${data.founder || "unknown"}`,
    `URL: ${data.url || "unknown"}`,
    `Sectors: ${data.thesis.sectors.join(", ")}`,
    "",
    "=== REAL SEARCH EVIDENCE (Tavily) ===",
    evidenceBlock || "(no queries returned anything)",
    deckBlock,
  ].join("\n");

  const messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage> = [
    new SystemMessage(systemParts.join("\n\n")),
    new HumanMessage(humanPrompt),
  ];

  let llmSteps = 0;
  let followUps = 0;
  let sourcingRaw = "";
  try {
    for (let round = 0; round < 5; round++) {
      const ai = await llm.invoke(messages);
      llmSteps++;
      messages.push(ai);
      const calls = ai.tool_calls ?? [];
      if (calls.length === 0) break;
      for (const call of calls) {
        if (followUps >= 4) {
          messages.push(
            new ToolMessage({
              content: JSON.stringify({ error: "follow-up budget exhausted" }),
              tool_call_id: call.id ?? `call_${followUps}`,
            }),
          );
          continue;
        }
        followUps++;
        const q = String((call.args as { query?: string })?.query ?? "");
        const outcome = await tavilySearch(q, { maxResults: 5 });
        tavilyRuns.push(outcome);
        if (outcome.ok) {
          t(
            "sourcing",
            outcome.results.length ? "tavily:results" : "tavily:empty",
            `${outcome.results.length} hits · ${q}`,
          );
          messages.push(
            new ToolMessage({
              content: JSON.stringify({
                results: outcome.results,
                answer: outcome.answer,
                count: outcome.results.length,
              }),
              tool_call_id: call.id ?? `call_${followUps}`,
            }),
          );
        } else {
          console.error("[sourcing] tavily follow-up error", outcome);
          t("sourcing", "tavily:error", `${outcome.error} · ${q}`);
          messages.push(
            new ToolMessage({
              content: JSON.stringify({ error: outcome.error, status: outcome.status }),
              tool_call_id: call.id ?? `call_${followUps}`,
            }),
          );
        }
      }
    }

    const lastAi = [...messages].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
    sourcingRaw =
      typeof lastAi?.content === "string"
        ? lastAi.content
        : Array.isArray(lastAi?.content)
          ? lastAi.content.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("\n")
          : "";
  } catch (e) {
    console.error("[sourcing] LLM summarization failed", e);
    // Degraded: still return evidence dump so assess can proceed.
    sourcingRaw = `Company Overview\n${evidenceBlock.slice(0, 6000)}\n\n(LLM summarization failed: ${(e as Error).message})`;
    t("sourcing", "llm:error", (e as Error).message);
  }

  t("sourcing", "done", `${llmSteps} LLM steps, ${plannedQueries.length} initial searches`);

  return {
    trace: traces,
    tavilyRuns,
    sourcingRaw,
    coldStart,
    coldStartConfidence,
  };
}

async function sourcingNode(state: State) {
  return runSourcing(state, "full");
}

async function gapFillSourcingNode(state: State) {
  return runSourcing(state, "gap-fill");
}

// ---------- Node: memory_write ----------

async function memoryWriteNode(state: State): Promise<Partial<State>> {
  const data = state.input;
  const traces: AgentTrace[] = [];
  const t = (agent: string, step: string, detail?: string) => traces.push({ agent, step, detail });
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  const { saveMemoryChunks } = await import("./rag.server");

  t("memory", "condense", "summarizing for DB storage");
  let condenseText = "";
  try {
    const condense = await chat().invoke([
      new SystemMessage(
        "You compress research findings into 2-3 short bullet points to save as VC notes. Be terse, factual, no fluff.",
      ),
      new HumanMessage(
        `Company: ${data.company}\n\nRaw findings:\n${state.sourcingRaw}\n\nReturn 2-3 bullets only.`,
      ),
    ]);
    condenseText =
      typeof condense.content === "string" ? condense.content : JSON.stringify(condense.content);
  } catch (e) {
    console.error("[memory_write] condense failed", e);
    condenseText = state.sourcingRaw.slice(0, 600);
    t("memory", "condense:error", (e as Error).message);
  }

  const evidenceUrls = state.tavilyRuns
    .flatMap((r) => (r.ok ? r.results.map((x) => x.url) : []))
    .filter(Boolean)
    .slice(0, 12);

  try {
    const { error } = await supabaseAdmin.from("vc_memory").upsert(
      {
        vc_name: data.vcName,
        topic: data.company,
        summary: condenseText.slice(0, 800),
        evidence_urls: evidenceUrls,
      },
      { onConflict: "vc_name,topic" },
    );
    if (error) throw error;
    t("memory", "saved", `vc_memory row upserted for ${data.vcName}/${data.company}`);
  } catch (e) {
    console.error("[memory_write] vc_memory upsert failed (non-blocking)", e);
    t("memory", "saved:error", (e as Error).message ?? String(e));
  }

  try {
    const chunkInputs = [
      {
        content: `Company: ${data.company}. ${condenseText}`.slice(0, 2000),
        kind: "research" as const,
        metadata: { company: data.company, founder: data.founder || null },
      },
      ...state.tavilyRuns.flatMap((r) =>
        r.ok
          ? r.results.slice(0, 2).map((h) => ({
              content: `${h.title} — ${h.content}`.slice(0, 1500),
              kind: "research" as const,
              metadata: { url: h.url, query: r.query, company: data.company },
            }))
          : [],
      ),
    ];
    const saved = await saveMemoryChunks({
      vcName: data.vcName,
      company: data.company,
      founderId: state.founderId,
      chunks: chunkInputs,
    });
    t("memory", "rag:saved", `${saved} chunks embedded into pgvector`);
  } catch (e) {
    console.error("[memory_write] rag save failed (non-blocking)", e);
    t("memory", "rag:save-error", (e as Error).message);
  }

  // Founder signals (append-only) — same payload as prior implementation
  if (state.founderId && data.founder) {
    try {
      const founderSignalRows = state.tavilyRuns
        .filter((r) => r.ok && r.query.toLowerCase().includes(normalizeName(data.founder)))
        .flatMap((r) =>
          r.ok
            ? r.results.slice(0, 3).map((h) => ({
                founder_id: state.founderId!,
                source: "tavily",
                signal_type: "reputation",
                weight: 1.0,
                payload: { title: h.title, snippet: h.content, query: r.query },
                evidence_url: h.url,
              }))
            : [],
        );
      if (founderSignalRows.length > 0) {
        const { error } = await supabaseAdmin.from("founder_signals").insert(founderSignalRows);
        if (error) throw error;
        t("memory", "signals:stored", `${founderSignalRows.length} founder signals`);
      }
    } catch (e) {
      console.error("[memory_write] founder_signals insert failed (non-blocking)", e);
      t("memory", "signals:error", (e as Error).message ?? String(e));
    }
  }

  return { trace: traces };
}

// ---------- Node: assess (+ validator) ----------

async function assessNode(state: State): Promise<Partial<State>> {
  const data = state.input;
  const traces: AgentTrace[] = [];
  const t = (agent: string, step: string, detail?: string) => traces.push({ agent, step, detail });
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");

  t("assessment", "start", "3-axis screening (Founder / Market / Idea)");

  const system = [
    "You are the Assessment Agent. Judge whether a VC should invest.",
    "Score founderScore, companyReputationScore, riskScore each on 0-10.",
    "Also produce a 3-axis screening (axes.founder, axes.market, axes.ideaVsMarket), each score 0-10, with a trend and a one-line rationale. Market gets a stance (bullish/neutral/bear). Idea-vs-market gets survivesAsIs=true if the current product survives without pivot.",
    "Include a 'disagreement' field — the single strongest counter-argument to your own recommendation. Do NOT leave it blank.",
    "Fill 'problemAndProduct' with 2-4 sentences describing the customer pain and how the product solves it.",
    "Fill 'tractionKPIs' with 4-6 items: ARR, Design Partners, Growth, Team, Runway, Pipeline. For each set disclosed=false and value='not disclosed' when the sourcing text does not provide the number — never invent numbers.",
    "For each claim, set evidenceUrl to the source URL when the sourcing text supports it; otherwise leave it empty. The Validator agent will re-check these afterwards.",
    "Base scores strictly on the sourcing data. Be conservative when evidence is thin.",
    "Keep arrays to 3-5 items. Keep strings concise.",
    "thesisFit must reflect whether the company fits the VC thesis (sectors, stage, geography, check size, ownership, risk appetite) provided in the prompt.",
    state.coldStart
      ? `This is a cold-start founder profile — reduce founderScore confidence and mark the trend cautiously.`
      : "",
    state.priorFounderScore != null
      ? `Prior founder score on file: ${state.priorFounderScore}/100. Note trend direction relative to this.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = [
    `VC thesis: sectors=${data.thesis.sectors.join(", ")}, stage=${data.thesis.stage}, geo=${data.thesis.geography}, check=${data.thesis.checkMin}-${data.thesis.checkMax}k, ownership=${data.thesis.ownership}%, risk=${data.thesis.risk}`,
    `Company: ${data.company}`,
    `Founder: ${data.founder || "unknown"}`,
    "",
    state.ragContext ? `Recalled memory (prior research):\n${state.ragContext}\n` : "",
    "Sourcing findings:",
    state.sourcingRaw,
  ].join("\n");

  let assessment: Assessment | null = null;
  const tryAssess = async (): Promise<Assessment | null> => {
    try {
      const structured = chat(0).withStructuredOutput(AssessmentSchema);
      return (await structured.invoke([
        new SystemMessage(system),
        new HumanMessage(prompt),
      ])) as Assessment;
    } catch (err) {
      console.error("[assess] structured output attempt failed", err);
      try {
        const raw = await chat(0).invoke([
          new SystemMessage(system + " Respond with ONLY valid JSON matching the assessment schema."),
          new HumanMessage(prompt),
        ]);
        const text = typeof raw.content === "string" ? raw.content : JSON.stringify(raw.content);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return AssessmentSchema.parse(JSON.parse(jsonMatch[0]));
      } catch (e2) {
        console.error("[assess] JSON parse attempt failed", e2);
      }
      return null;
    }
  };

  // Retry once on schema/structured-output failure, then degraded fallback.
  assessment = await tryAssess();
  if (!assessment) {
    console.warn("[assess] first attempt failed — retrying once");
    assessment = await tryAssess();
  }
  if (!assessment) {
    console.error("[assess] both attempts failed — returning conservative degraded assessment");
    assessment = {
      recommendation: "diligence",
      thesisFit: false,
      thesisFitNote: "Assessment degraded: LLM structured output failed after retry. Treat as incomplete diligence.",
      founderScore: 5,
      founderBlurb: "Insufficient structured assessment; default mid score.",
      companyReputationScore: 5,
      riskScore: 7,
      shouldInvest: false,
      snapshot: `Degraded assessment for ${data.company}. Review sourcingRaw manually.`,
      hypotheses: ["Structured LLM assessment failed; hypotheses unavailable."],
      strengths: ["See sourcing findings"],
      weaknesses: ["Assessment agent could not produce structured output"],
      opportunities: [],
      risks: ["Model output validation failure"],
      claims: [],
      gaps: ["Full structured assessment unavailable due to LLM parse failure"],
      problemAndProduct: "Not assessed — LLM output failed schema validation after one retry.",
      tractionKPIs: [
        { label: "ARR", value: "not disclosed", disclosed: false },
        { label: "Design Partners", value: "not disclosed", disclosed: false },
        { label: "Growth", value: "not disclosed", disclosed: false },
        { label: "Team", value: "not disclosed", disclosed: false },
      ],
      axes: {
        founder: { score: 5, trend: "stable", rationale: "Degraded default — LLM assessment failed." },
        market: {
          score: 5,
          stance: "neutral",
          trend: "stable",
          rationale: "Degraded default — LLM assessment failed.",
        },
        ideaVsMarket: {
          score: 5,
          survivesAsIs: true,
          trend: "stable",
          rationale: "Degraded default — LLM assessment failed.",
        },
      },
      disagreement: "This is a degraded fallback response; do not treat scores as authoritative.",
    };
    t("assessment", "degraded", "schema validation failed after retry");
  }
  t("assessment", "done", assessment ? assessment.recommendation : "fallback");

  // Validator sub-step
  if (assessment && assessment.claims.length > 0) {
    t("validator", "start", `verifying ${assessment.claims.length} claims`);
    const ClaimVerdict = z.object({
      trust: z.enum(["verified", "unverified", "contradicted"]),
      reason: z.string(),
      evidenceUrl: z.string(),
    });
    const validated = await Promise.all(
      assessment.claims.map(async (c) => {
        const search = await tavilySearch(`${data.company} ${c.text}`.slice(0, 380), { maxResults: 4 });
        if (!search.ok) {
          t("validator", "search:error", `${search.error} · ${c.text.slice(0, 50)}`);
          return { ...c, trust: c.trust, evidence: c.evidence + " (validator: search failed)" };
        }
        if (search.results.length === 0) {
          t("validator", "no-evidence", c.text.slice(0, 60));
          return {
            ...c,
            trust: "unverified" as const,
            evidence: "Validator found no external evidence for this claim.",
            evidenceUrl: "",
          };
        }
        const evidenceText = search.results
          .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.content}`)
          .join("\n\n");
        try {
          const structured = chat(0).withStructuredOutput(ClaimVerdict);
          const output = (await structured.invoke([
            new SystemMessage(
              "You are the Validator Agent. Given a claim about a company and real web search snippets, decide if the claim is verified (supported), unverified (no direct evidence either way), or contradicted (evidence directly disputes it). Pick the single best evidenceUrl from the snippets, or empty string if none apply. Be strict — do not mark 'verified' unless the snippet explicitly supports the claim.",
            ),
            new HumanMessage(`Claim: "${c.text}"\n\nSearch results:\n${evidenceText}`),
          ])) as z.infer<typeof ClaimVerdict>;
          t("validator", output.trust, c.text.slice(0, 60));
          return { ...c, trust: output.trust, evidence: output.reason, evidenceUrl: output.evidenceUrl };
        } catch {
          return c;
        }
      }),
    );
    assessment = { ...assessment, claims: validated };
    t(
      "validator",
      "done",
      `${validated.filter((v) => v.trust === "contradicted").length} contradicted, ${validated.filter((v) => v.trust === "verified").length} verified`,
    );
  }

  let founderScoreHistory: number[] =
    state.priorFounderScore != null ? [state.priorFounderScore] : [];
  if (state.founderId && assessment) {
    const newScore100 = Math.round(assessment.axes.founder.score * 10);
    try {
      const { error } = await supabaseAdmin.from("founder_scores").insert({
        founder_id: state.founderId,
        score: newScore100,
        subscores: {
          axis: assessment.axes.founder.score,
          reputation: assessment.companyReputationScore,
        },
        confidence: state.coldStart ? state.coldStartConfidence : 0.85,
        trend: assessment.axes.founder.trend,
        rationale: assessment.axes.founder.rationale,
      });
      if (error) throw error;
      founderScoreHistory = [...founderScoreHistory, newScore100];
      t("memory", "founder-score:saved", `${newScore100}/100 · trend ${assessment.axes.founder.trend}`);
    } catch (e) {
      console.error("[assess] founder_scores insert failed (non-blocking)", e);
      t("memory", "founder-score:error", (e as Error).message ?? String(e));
      // Still expose the computed score in history for the UI even if DB write failed.
      founderScoreHistory = [...founderScoreHistory, newScore100];
    }
  }
  if (assessment) {
    try {
      const { error } = await supabaseAdmin.from("screening_scores").insert({
        vc_name: data.vcName,
        company: data.company,
        founder_id: state.founderId,
        founder_score: assessment.axes.founder.score,
        founder_trend: assessment.axes.founder.trend,
        founder_rationale: assessment.axes.founder.rationale,
        market_score: assessment.axes.market.score,
        market_stance: assessment.axes.market.stance,
        market_trend: assessment.axes.market.trend,
        market_rationale: assessment.axes.market.rationale,
        idea_score: assessment.axes.ideaVsMarket.score,
        idea_survives_as_is: assessment.axes.ideaVsMarket.survivesAsIs,
        idea_trend: assessment.axes.ideaVsMarket.trend,
        idea_rationale: assessment.axes.ideaVsMarket.rationale,
        recommendation: assessment.recommendation,
        disagreement: assessment.disagreement,
        payload: { coldStart: state.coldStart, coldStartConfidence: state.coldStartConfidence },
      });
      if (error) throw error;
    } catch (e) {
      console.error("[assess] screening_scores insert failed (non-blocking)", e);
      t("assessment", "persist:error", (e as Error).message ?? String(e));
    }
  }

  return {
    trace: traces,
    assessment,
    founderScoreHistory,
  };
}

// ---------- Wire the graph ----------

function routeAfterMemory(state: State): "sourcing" | "gap_fill_sourcing" {
  return state.memorySufficient ? "gap_fill_sourcing" : "sourcing";
}

const analysisGraph = new StateGraph(GraphState)
  .addNode("memory_check", memoryCheckNode)
  .addNode("sourcing", sourcingNode)
  .addNode("gap_fill_sourcing", gapFillSourcingNode)
  .addNode("memory_write", memoryWriteNode)
  .addNode("assess", assessNode)
  .addEdge(START, "memory_check")
  .addConditionalEdges("memory_check", routeAfterMemory, {
    sourcing: "sourcing",
    gap_fill_sourcing: "gap_fill_sourcing",
  })
  .addEdge("sourcing", "memory_write")
  .addEdge("gap_fill_sourcing", "memory_write")
  .addEdge("memory_write", "assess")
  .addEdge("assess", END);

const compiled = analysisGraph.compile();

/** Run the full inbound analysis graph and map state → public API shape. */
export async function runAnalysisGraph(input: AnalysisInput): Promise<AnalysisResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const final = await compiled.invoke({ input });

  return {
    company: input.company,
    founder: input.founder,
    trace: final.trace,
    priorMemoryUsed: final.priorMemoryUsed,
    sourcingRaw: final.sourcingRaw,
    tavilyRuns: final.tavilyRuns,
    assessment: final.assessment,
    coldStart: {
      active: final.coldStart,
      confidence: final.coldStartConfidence,
      note: final.coldStart
        ? "Founder has limited public track record; scored using public footprint (LinkedIn / X / GitHub) with reduced confidence."
        : "",
    },
    founderScoreHistory: final.founderScoreHistory,
    priorFounderScore: final.priorFounderScore,
    memory: {
      ragChunks: final.ragChunks,
      topSimilarity: final.ragTopSimilarity,
      sufficient: final.memorySufficient,
    },
  };
}
