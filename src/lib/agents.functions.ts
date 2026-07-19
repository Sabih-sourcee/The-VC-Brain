import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { chatModel } from "./ai-gateway.server";

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const InputSchema = z.object({
  vcName: z.string().min(1),
  company: z.string().min(1),
  founder: z.string().default(""),
  url: z.string().default(""),
  deckText: z.string().default(""),
  thesis: z.object({
    sectors: z.array(z.string()),
    stage: z.string(),
    geography: z.string(),
    checkMin: z.number(),
    checkMax: z.number(),
    ownership: z.number(),
    risk: z.string(),
  }),
});

type AgentTrace = { agent: string; step: string; detail?: string };

// ---------- Real web search via Tavily ----------

type TavilyResult = { title: string; url: string; content: string; score?: number };
type TavilySearchOutcome =
  | { ok: true; query: string; results: TavilyResult[]; answer?: string }
  | { ok: false; query: string; error: string; status?: number };

async function tavilySearch(
  query: string,
  opts: { maxResults?: number; includeDomains?: string[] } = {},
): Promise<TavilySearchOutcome> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { ok: false, query, error: "TAVILY_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: opts.maxResults ?? 5,
        include_answer: true,
        include_domains: opts.includeDomains,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        query,
        status: res.status,
        error: `Tavily HTTP ${res.status}: ${body.slice(0, 300) || res.statusText}`,
      };
    }
    const json = (await res.json()) as {
      answer?: string;
      results?: Array<{ title?: string; url?: string; content?: string; score?: number }>;
    };
    const results: TavilyResult[] = (json.results ?? []).map((r) => ({
      title: String(r.title ?? ""),
      url: String(r.url ?? ""),
      content: String(r.content ?? "").slice(0, 800),
      score: typeof r.score === "number" ? r.score : undefined,
    }));
    return { ok: true, query, results, answer: json.answer };
  } catch (e) {
    return { ok: false, query, error: `Tavily network error: ${(e as Error).message}` };
  }
}

// ---------- The 3 agents ----------

export const runAnalysis = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not configured");

    const trace: AgentTrace[] = [];
    const t = (a: string, s: string, d?: string) => trace.push({ agent: a, step: s, detail: d });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { retrieveMemory, saveMemoryChunks } = await import("@/lib/rag.server");

    // === 1. MEMORY AGENT (recall from DB) =================================
    t("memory", "recall", `${data.vcName}.md · DB lookup`);
    const memoryQuery = await supabaseAdmin
      .from("vc_memory")
      .select("topic, summary, evidence_urls, updated_at")
      .eq("vc_name", data.vcName)
      .order("updated_at", { ascending: false })
      .limit(50);
    const allNotes = memoryQuery.data ?? [];
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
    const priorContext =
      relevantMemory.length > 0
        ? relevantMemory.map((m) => `- [${m.topic}] ${m.summary}`).join("\n")
        : "(no prior notes)";
    t("memory", relevantMemory.length ? "hit" : "miss", `${relevantMemory.length} prior notes`);

    // === 1a. RAG SEMANTIC RECALL (pgvector) ==============================
    // The Memory agent asks: "do we already know this company?" via embeddings,
    // BEFORE the Sourcing agent spends tokens/HTTP re-crawling the web.
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
    // Sufficiency gate: enough high-similarity memory to skip a full re-crawl?
    const memorySufficient = ragChunks.length >= 4 && ragTopSimilarity >= 0.82;
    const ragContext = ragChunks.length
      ? ragChunks.map((c, i) => `[mem ${i + 1} · sim ${c.similarity.toFixed(2)}] ${c.content}`).join("\n")
      : "";
    t(
      "memory",
      memorySufficient ? "decision:sufficient" : "decision:gap",
      memorySufficient
        ? "memory fresh — Sourcing will only gap-fill"
        : "memory thin/stale — running full Sourcing",
    );

    // === 1b. FOUNDER identity + prior score =============================
    let founderId: string | null = null;
    let priorFounderScore: number | null = null;
    if (data.founder) {
      const normFounder = normalizeName(data.founder);
      const upsert = await supabaseAdmin
        .from("founders")
        .upsert(
          { name: data.founder, normalized_name: normFounder },
          { onConflict: "normalized_name" },
        )
        .select("id")
        .maybeSingle();
      founderId = upsert.data?.id ?? null;
      if (founderId) {
        const prev = await supabaseAdmin
          .from("founder_scores")
          .select("score")
          .eq("founder_id", founderId)
          .order("computed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        priorFounderScore = prev.data?.score ?? null;
        t(
          "memory",
          priorFounderScore != null ? "founder:known" : "founder:new",
          priorFounderScore != null
            ? `prior founder score ${priorFounderScore}/100`
            : `cold-start candidate ${data.founder}`,
        );
      }
    }

    // === 2. SOURCING AGENT (real web + reddit research) ===================
    const model = chatModel();

    t("sourcing", "start", "running targeted Tavily searches");

    // Deterministic, targeted searches — real HTTP, not model-imagined.
    const sectorHint = data.thesis.sectors.slice(0, 2).join(" ");
    const fullQueries: string[] = [
      `${data.company} company overview`,
      `${data.company} reviews complaints`,
      `${data.company} reddit`,
      ...(data.founder ? [`${data.founder} founder background`] : []),
      ...(data.url ? [`${data.url} site review`] : []),
      ...(sectorHint ? [`${data.company} ${sectorHint} traction funding`] : []),
    ];
    // Memory-aware: when memory is already rich, only gap-fill for freshness
    // instead of re-crawling everything the Memory agent already recalled.
    const plannedQueries: string[] = memorySufficient
      ? [
          `${data.company} latest news`,
          ...(sectorHint ? [`${data.company} ${sectorHint} funding 2026`] : []),
        ]
      : fullQueries;
    t(
      "sourcing",
      memorySufficient ? "mode:gap-fill" : "mode:full",
      `${plannedQueries.length} planned queries`,
    );

    const tavilyRuns: TavilySearchOutcome[] = [];
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

    // === 2b. COLD-START scorer ==========================================
    // If total real evidence is thin, do targeted public-footprint searches
    // (Twitter/X, LinkedIn, personal site, GitHub) to build a confidence-adjusted profile.
    const totalHits = tavilyRuns.reduce((n, r) => n + (r.ok ? r.results.length : 0), 0);
    const founderHits = tavilyRuns
      .filter((r) => r.ok && r.query.toLowerCase().includes(normalizeName(data.founder || "")))
      .reduce((n, r) => n + (r.ok ? r.results.length : 0), 0);
    const coldStart = !!data.founder && (totalHits < 6 || founderHits < 2);
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
      const coldHits = tavilyRuns.slice(-footprintQueries.length).reduce((n, r) => n + (r.ok ? r.results.length : 0), 0);
      // Confidence: 0.4 baseline, +0.1 per public-footprint hit, capped 0.8 for cold-start
      coldStartConfidence = Math.min(0.8, 0.4 + coldHits * 0.1);
    }

    // Also let the LLM issue follow-up searches for specific claims it wants to verify.
    const evidenceBlock = tavilyRuns
      .map((r) => {
        if (!r.ok) return `QUERY: ${r.query}\nERROR: ${r.error}`;
        if (r.results.length === 0) return `QUERY: ${r.query}\nNO RESULTS`;
        return [
          `QUERY: ${r.query}`,
          r.answer ? `TAVILY_ANSWER: ${r.answer}` : "",
          ...r.results.map(
            (x, i) => `[${i + 1}] ${x.title}\nURL: ${x.url}\nSNIPPET: ${x.content}`,
          ),
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n---\n\n");

    const deckBlock = data.deckText
      ? `\n\n=== PITCH DECK CONTENT (uploaded by founder) ===\n${data.deckText.slice(0, 8000)}`
      : "";
    if (data.deckText) t("sourcing", "deck:ingested", `${data.deckText.length} chars from PDF`);

    const sourcingResult = await generateText({
      model,
      system: [
        "You are the Sourcing Agent for a VC firm.",
        "You have been given REAL web search results from Tavily below. Ground every statement in those snippets.",
        "You may call tavily_search to verify specific additional claims (max 4 follow-up searches).",
        "If evidence for a claim is absent from all results, say 'no evidence found' — do NOT invent facts.",
        "Output a factual dump organized as: Company Overview, Founder Signals, Reputation & Reviews, Traction/Funding, Red Flags. Cite [url] inline.",
        data.deckText ? "A pitch deck was uploaded — extract self-reported claims (traction, KPIs, team) and mark them separately from externally verified facts." : "",
        coldStart
          ? "This is a COLD-START founder (little public track record). Lean on the LinkedIn / Twitter / GitHub / interview snippets to extract signal, but explicitly mark low-confidence claims."
          : "",
        priorContext !== "(no prior notes)"
          ? `Prior notes from ${data.vcName}:\n${priorContext}`
          : "No prior notes exist for this VC.",
        ragContext
          ? `RETRIEVED MEMORY (semantic recall of prior research — reuse it, do NOT re-derive what's already here; focus new searches on gaps):\n${ragContext}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      prompt: [
        `Company: ${data.company}`,
        `Founder: ${data.founder || "unknown"}`,
        `URL: ${data.url || "unknown"}`,
        `Sectors: ${data.thesis.sectors.join(", ")}`,
        "",
        "=== REAL SEARCH EVIDENCE (Tavily) ===",
        evidenceBlock || "(no queries returned anything)",
        deckBlock,
      ].join("\n"),
      tools: {
        tavily_search: tool({
          description:
            "Search the live web via Tavily. Use for follow-up verification of specific claims. Returns title/url/snippet.",
          inputSchema: z.object({ query: z.string() }),
          execute: async ({ query }) => {
            const outcome = await tavilySearch(query, { maxResults: 5 });
            if (outcome.ok) {
              t(
                "sourcing",
                outcome.results.length ? "tavily:results" : "tavily:empty",
                `${outcome.results.length} hits · ${query}`,
              );
              return {
                results: outcome.results,
                answer: outcome.answer,
                count: outcome.results.length,
              };
            }
            console.error("[sourcing] tavily follow-up error", outcome);
            t("sourcing", "tavily:error", `${outcome.error} · ${query}`);
            return { error: outcome.error, status: outcome.status };
          },
        }),
      },
      stopWhen: stepCountIs(50),
    });
    const sourcingRaw = sourcingResult.text;
    t("sourcing", "done", `${sourcingResult.steps.length} LLM steps, ${tavilyRuns.length} initial searches`);

    // === 2c. Persist founder signals from Tavily hits ====================
    if (founderId) {
      const founderSignalRows = tavilyRuns
        .filter((r) => r.ok && r.query.toLowerCase().includes(normalizeName(data.founder)))
        .flatMap((r) =>
          r.ok
            ? r.results.slice(0, 3).map((h) => ({
                founder_id: founderId!,
                source: "tavily",
                signal_type: "reputation",
                weight: 1.0,
                payload: { title: h.title, snippet: h.content, query: r.query },
                evidence_url: h.url,
              }))
            : [],
        );
      if (founderSignalRows.length > 0) {
        await supabaseAdmin.from("founder_signals").insert(founderSignalRows);
        t("memory", "signals:stored", `${founderSignalRows.length} founder signals`);
      }
    }

    // === 3. MEMORY AGENT (condense + save to DB) =========================
    t("memory", "condense", "summarizing for DB storage");
    const condense = await generateText({
      model,
      system: "You compress research findings into 2-3 short bullet points to save as VC notes. Be terse, factual, no fluff.",
      prompt: `Company: ${data.company}\n\nRaw findings:\n${sourcingRaw}\n\nReturn 2-3 bullets only.`,
    });
    const evidenceUrls = tavilyRuns
      .flatMap((r) => (r.ok ? r.results.map((x) => x.url) : []))
      .filter(Boolean)
      .slice(0, 12);
    await supabaseAdmin
      .from("vc_memory")
      .upsert(
        {
          vc_name: data.vcName,
          topic: data.company,
          summary: condense.text.slice(0, 800),
          evidence_urls: evidenceUrls,
        },
        { onConflict: "vc_name,topic" },
      );
    t("memory", "saved", `vc_memory row upserted for ${data.vcName}/${data.company}`);

    // === 3b. RAG PERSIST — embed token-optimized chunks into pgvector ======
    // Store the condensed summary + a few strongest evidence snippets so the
    // next run for this company/founder can recall instead of re-crawling.
    try {
      const chunkInputs = [
        {
          content: `Company: ${data.company}. ${condense.text}`.slice(0, 2000),
          kind: "research" as const,
          metadata: { company: data.company, founder: data.founder || null },
        },
        ...tavilyRuns.flatMap((r) =>
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
        founderId,
        chunks: chunkInputs,
      });
      t("memory", "rag:saved", `${saved} chunks embedded into pgvector`);
    } catch (e) {
      t("memory", "rag:save-error", (e as Error).message);
    }

    // === 4. ASSESSMENT AGENT (structured scoring) =========================
    t("assessment", "start", "3-axis screening (Founder / Market / Idea)");
    const strictModel = chatModel({ structuredOutputs: true });

    const AssessmentSchema = z.object({
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

    let assessment: z.infer<typeof AssessmentSchema> | null = null;
    try {
      const { output } = await generateText({
        model: strictModel,
        output: Output.object({ schema: AssessmentSchema }),
        system: [
          "You are the Assessment Agent. Judge whether a VC should invest.",
          "Score founderScore, companyReputationScore, riskScore each on 0-10.",
          "Also produce a 3-axis screening (axes.founder, axes.market, axes.ideaVsMarket), each score 0-10, with a trend and a one-line rationale. Market gets a stance (bullish/neutral/bear). Idea-vs-market gets survivesAsIs=true if the current product survives without pivot.",
          "Include a 'disagreement' field — the single strongest counter-argument to your own recommendation. Do NOT leave it blank.",
          "Fill 'problemAndProduct' with 2-4 sentences describing the customer pain and how the product solves it.",
          "Fill 'tractionKPIs' with 4-6 items: ARR, Design Partners, Growth, Team, Runway, Pipeline. For each set disclosed=false and value='not disclosed' when the sourcing text does not provide the number — never invent numbers.",
          "For each claim, set evidenceUrl to the source URL when the sourcing text supports it; otherwise leave it empty. The Validator agent will re-check these afterwards.",
          "Base scores strictly on the sourcing data. Be conservative when evidence is thin.",
          "Keep arrays to 3-5 items. Keep strings concise.",
          coldStart
            ? `This is a cold-start founder profile — reduce founderScore confidence and mark the trend cautiously.`
            : "",
          priorFounderScore != null
            ? `Prior founder score on file: ${priorFounderScore}/100. Note trend direction relative to this.`
            : "",
        ].join(" "),
        prompt: [
          `VC thesis: sectors=${data.thesis.sectors.join(", ")}, stage=${data.thesis.stage}, geo=${data.thesis.geography}, risk=${data.thesis.risk}`,
          `Company: ${data.company}`,
          `Founder: ${data.founder || "unknown"}`,
          "",
          ragContext ? `Recalled memory (prior research):\n${ragContext}\n` : "",
          "Sourcing findings:",
          sourcingRaw,
        ].join("\n"),
      });
      assessment = output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        try {
          assessment = AssessmentSchema.parse(JSON.parse(err.text ?? "{}"));
        } catch {
          assessment = null;
        }
      } else {
        throw err;
      }
    }
    t("assessment", "done", assessment ? assessment.recommendation : "fallback");

    // === 4c. VALIDATOR AGENT (cross-check claims vs Tavily) ==============
    if (assessment && assessment.claims.length > 0) {
      t("validator", "start", `verifying ${assessment.claims.length} claims`);
      const validated = await Promise.all(
        assessment.claims.map(async (c) => {
          const search = await tavilySearch(`${data.company} ${c.text}`.slice(0, 380), { maxResults: 4 });
          if (!search.ok) {
            t("validator", "search:error", `${search.error} · ${c.text.slice(0, 50)}`);
            return { ...c, trust: c.trust, evidence: c.evidence + " (validator: search failed)" };
          }
          if (search.results.length === 0) {
            t("validator", "no-evidence", c.text.slice(0, 60));
            return { ...c, trust: "unverified" as const, evidence: "Validator found no external evidence for this claim.", evidenceUrl: "" };
          }
          const evidenceText = search.results
            .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.content}`)
            .join("\n\n");
          try {
            const { output } = await generateText({
              model: strictModel,
              output: Output.object({
                schema: z.object({
                  trust: z.enum(["verified", "unverified", "contradicted"]),
                  reason: z.string(),
                  evidenceUrl: z.string(),
                }),
              }),
              system: "You are the Validator Agent. Given a claim about a company and real web search snippets, decide if the claim is verified (supported), unverified (no direct evidence either way), or contradicted (evidence directly disputes it). Pick the single best evidenceUrl from the snippets, or empty string if none apply. Be strict — do not mark 'verified' unless the snippet explicitly supports the claim.",
              prompt: `Claim: "${c.text}"\n\nSearch results:\n${evidenceText}`,
            });
            t("validator", output.trust, c.text.slice(0, 60));
            return { ...c, trust: output.trust, evidence: output.reason, evidenceUrl: output.evidenceUrl };
          } catch {
            return c;
          }
        }),
      );
      assessment.claims = validated;
      t("validator", "done", `${validated.filter((v) => v.trust === "contradicted").length} contradicted, ${validated.filter((v) => v.trust === "verified").length} verified`);
    }

    // === 4b. Persist founder score + screening row =======================
    let founderScoreHistory: number[] = priorFounderScore != null ? [priorFounderScore] : [];
    if (founderId && assessment) {
      const newScore100 = Math.round(assessment.axes.founder.score * 10);
      await supabaseAdmin.from("founder_scores").insert({
        founder_id: founderId,
        score: newScore100,
        subscores: {
          axis: assessment.axes.founder.score,
          reputation: assessment.companyReputationScore,
        },
        confidence: coldStart ? coldStartConfidence : 0.85,
        trend: assessment.axes.founder.trend,
        rationale: assessment.axes.founder.rationale,
      });
      founderScoreHistory = [...founderScoreHistory, newScore100];
      t("memory", "founder-score:saved", `${newScore100}/100 · trend ${assessment.axes.founder.trend}`);
    }
    if (assessment) {
      await supabaseAdmin.from("screening_scores").insert({
        vc_name: data.vcName,
        company: data.company,
        founder_id: founderId,
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
        payload: { coldStart, coldStartConfidence },
      });
    }

    return {
      company: data.company,
      founder: data.founder,
      trace,
      priorMemoryUsed: relevantMemory,
      sourcingRaw,
      tavilyRuns,
      assessment,
      coldStart: {
        active: coldStart,
        confidence: coldStartConfidence,
        note: coldStart
          ? "Founder has limited public track record; scored using public footprint (LinkedIn / X / GitHub) with reduced confidence."
          : "",
      },
      founderScoreHistory,
      priorFounderScore,
      memory: {
        ragChunks: ragChunks.length,
        topSimilarity: ragTopSimilarity,
        sufficient: memorySufficient,
      },
    };
  });

export type RunAnalysisResult = Awaited<ReturnType<typeof runAnalysis>>;