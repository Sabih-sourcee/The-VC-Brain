import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { chatModel } from "./ai-gateway.server";

const InputSchema = z.object({
  query: z.string().min(1),
});

const FilterSchema = z.object({
  keywords: z.array(z.string()),
  minScore: z.number(),
  geography: z.string(),
  sector: z.string(),
  signalTypes: z.array(z.string()),
});

export type FounderSearchResult = {
  query: string;
  filters: z.infer<typeof FilterSchema>;
  matches: Array<{
    founderId: string;
    name: string;
    latestScore: number | null;
    trend: string | null;
    rationale: string | null;
    signals: Array<{ source: string; snippet: string; url: string | null }>;
    screenings: Array<{ vc: string; company: string; recommendation: string; createdAt: string }>;
    relevance: number;
    reason: string;
  }>;
};

export const searchFounders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<FounderSearchResult> => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. LLM parses natural language into structured filters
    let filters: z.infer<typeof FilterSchema> = { keywords: [], minScore: 0, geography: "", sector: "", signalTypes: [] };
    try {
      const { output } = await generateText({
        model: chatModel({ structuredOutputs: true }),
        output: Output.object({ schema: FilterSchema }),
        system: "Extract structured filters from a VC's natural-language founder search. Empty strings and empty arrays are OK when the query doesn't mention that attribute. keywords should be technical/domain terms (e.g. 'AI infra', 'vector db'). minScore is 0-100.",
        prompt: data.query,
      });
      filters = output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        try { filters = FilterSchema.parse(JSON.parse(err.text ?? "{}")); } catch { /* keep defaults */ }
      }
    }

    // 2. Fetch candidate founders + their latest score + signals
    const { data: founders } = await supabaseAdmin
      .from("founders")
      .select("id, name, bio, linkedin_url, github_handle, twitter_handle")
      .limit(200);
    if (!founders || founders.length === 0) {
      return { query: data.query, filters, matches: [] };
    }
    const founderIds = founders.map((f) => f.id);
    const [{ data: scores }, { data: signals }, { data: screenings }] = await Promise.all([
      supabaseAdmin.from("founder_scores").select("founder_id, score, trend, rationale, computed_at").in("founder_id", founderIds).order("computed_at", { ascending: false }),
      supabaseAdmin.from("founder_signals").select("founder_id, source, signal_type, payload, evidence_url").in("founder_id", founderIds).limit(500),
      supabaseAdmin.from("screening_scores").select("founder_id, vc_name, company, recommendation, created_at").in("founder_id", founderIds).order("created_at", { ascending: false }),
    ]);

    const latestScoreMap = new Map<string, { score: number; trend: string; rationale: string | null }>();
    for (const s of scores ?? []) {
      if (!latestScoreMap.has(s.founder_id)) {
        latestScoreMap.set(s.founder_id, { score: Number(s.score), trend: s.trend, rationale: s.rationale });
      }
    }
    const signalMap = new Map<string, Array<{ source: string; snippet: string; url: string | null }>>();
    for (const sig of signals ?? []) {
      const arr = signalMap.get(sig.founder_id) ?? [];
      const payload = (sig.payload ?? {}) as { title?: string; snippet?: string };
      arr.push({ source: sig.source, snippet: payload.title || payload.snippet || sig.signal_type, url: sig.evidence_url });
      signalMap.set(sig.founder_id, arr);
    }
    const screeningMap = new Map<string, Array<{ vc: string; company: string; recommendation: string; createdAt: string }>>();
    for (const s of screenings ?? []) {
      if (!s.founder_id) continue;
      const arr = screeningMap.get(s.founder_id) ?? [];
      arr.push({ vc: s.vc_name, company: s.company, recommendation: s.recommendation, createdAt: s.created_at });
      screeningMap.set(s.founder_id, arr);
    }

    // 3. Rank via LLM — batched scoring against the NL query
    const enriched = founders.map((f) => {
      const latest = latestScoreMap.get(f.id);
      const sigs = signalMap.get(f.id) ?? [];
      return {
        founderId: f.id,
        name: f.name,
        bio: f.bio ?? "",
        latestScore: latest ? latest.score : null,
        trend: latest ? latest.trend : null,
        rationale: latest ? latest.rationale : null,
        signals: sigs.slice(0, 3),
        screenings: screeningMap.get(f.id) ?? [],
      };
    });

    // Pre-filter by minScore
    const preFiltered = enriched.filter((e) => e.latestScore == null || e.latestScore >= filters.minScore);

    // LLM relevance batch
    const RankSchema = z.object({
      matches: z.array(z.object({
        founderId: z.string(),
        relevance: z.number(),
        reason: z.string(),
      })),
    });
    let ranked: Array<{ founderId: string; relevance: number; reason: string }> = [];
    if (preFiltered.length > 0) {
      const catalog = preFiltered.slice(0, 60).map((e) => ({
        founderId: e.founderId,
        name: e.name,
        latestScore: e.latestScore,
        rationale: e.rationale,
        signals: e.signals.map((s) => s.snippet).slice(0, 3),
        screenings: e.screenings.slice(0, 3).map((s) => `${s.company} (${s.recommendation})`),
      }));
      try {
        const { output } = await generateText({
          model: chatModel({ structuredOutputs: true }),
          output: Output.object({ schema: RankSchema }),
          system: "Score each founder 0-100 on how well they match the VC's natural-language query. Only return founders scoring >= 40. Include a short reason grounded in their signals/screenings/rationale.",
          prompt: `VC query: "${data.query}"\nExtracted filters: ${JSON.stringify(filters)}\n\nFounder catalog:\n${JSON.stringify(catalog, null, 2)}`,
        });
        ranked = output.matches;
      } catch (err) {
        if (NoObjectGeneratedError.isInstance(err)) {
          try { ranked = RankSchema.parse(JSON.parse(err.text ?? "{}")).matches; } catch { ranked = []; }
        }
      }
    }

    const enrichedById = new Map(preFiltered.map((e) => [e.founderId, e]));
    const matches = ranked
      .map((r) => {
        const e = enrichedById.get(r.founderId);
        if (!e) return null;
        return {
          founderId: e.founderId,
          name: e.name,
          latestScore: e.latestScore,
          trend: e.trend,
          rationale: e.rationale,
          signals: e.signals,
          screenings: e.screenings,
          relevance: r.relevance,
          reason: r.reason,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.relevance - a.relevance);

    return { query: data.query, filters, matches };
  });