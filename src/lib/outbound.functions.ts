import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { chatModel } from "@/lib/ai-gateway.server";

const InputSchema = z.object({
  sectors: z.array(z.string()).default([]),
  stage: z.string().default("Seed"),
  geography: z.string().default(""),
  keyword: z.string().default(""),
});

export type OutboundCandidate = {
  source: "hackernews" | "github" | "arxiv" | "tavily";
  title: string;
  url: string;
  snippet: string;
  author?: string;
  signalScore: number; // 0-1, LLM-computed relevance to thesis
  relevanceReason?: string;
  signals: string[];
};

type RawHit = Omit<OutboundCandidate, "signalScore" | "relevanceReason">;

// Extract short keyword terms from a verbose thesis via LLM
async function extractKeywords(thesis: string): Promise<string[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return thesis.split(/[\s,]+/).filter((w) => w.length > 3).slice(0, 5);
  try {
    const { output } = await generateText({
      model: chatModel({ structuredOutputs: true }),
      output: Output.object({
        schema: z.object({ keywords: z.array(z.string()).min(2).max(6) }),
      }),
      prompt: `Extract 3-5 short technical keyword phrases (1-3 words each) suitable for searching arXiv / GitHub / HackerNews from this VC thesis. Return distinct terms that would surface technical founders/papers/projects. Avoid generic words like "startup", "AI", "company".\n\nThesis: ${thesis}`,
    });
    return output.keywords.map((k) => k.trim()).filter(Boolean);
  } catch (e) {
    console.error("[outbound] keyword extraction failed", e);
    return thesis.split(/[\s,]+/).filter((w) => w.length > 3).slice(0, 5);
  }
}

type DebugInfo = { query: string; count?: number; status?: number; error?: string; sample?: string };

async function scanHackerNews(keywords: string[]): Promise<{ hits: RawHit[]; debug: DebugInfo }> {
  const query = keywords.slice(0, 3).join(" ");
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=8`;
    const res = await fetch(url);
    if (!res.ok) return { hits: [], debug: { query: url, status: res.status } };
    const json = (await res.json()) as {
      hits?: Array<{
        title?: string;
        url?: string;
        author?: string;
        points?: number;
        objectID?: string;
        story_text?: string;
      }>;
    };
    const hits = (json.hits ?? [])
      .filter((h) => h.title)
      .map<RawHit>((h) => ({
        source: "hackernews" as const,
        title: h.title || "",
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        snippet: (h.story_text ?? "").slice(0, 240),
        author: h.author,
        signals: [`${h.points ?? 0} pts on HN`, "self-launch signal"],
      }));
    return { hits, debug: { query: url, count: hits.length, sample: JSON.stringify(json.hits?.[0] ?? {}).slice(0, 400) } };
  } catch {
    return { hits: [], debug: { query, error: "fetch failed" } };
  }
}

async function scanGitHub(keywords: string[]): Promise<{ hits: RawHit[]; debug: DebugInfo }> {
  // Use OR between keywords, restrict to code/repo search with min stars
  const query = keywords.slice(0, 4).map((k) => `"${k}"`).join(" OR ");
  try {
    const q = `${query} stars:>50 pushed:>2024-01-01`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=8`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return { hits: [], debug: { query: url, status: res.status } };
    const json = (await res.json()) as {
      items?: Array<{
        full_name?: string;
        html_url?: string;
        description?: string;
        stargazers_count?: number;
        owner?: { login?: string; html_url?: string };
      }>;
    };
    const hits = (json.items ?? []).map<RawHit>((r) => ({
      source: "github" as const,
      title: r.full_name || "",
      url: r.html_url || "",
      snippet: r.description || "",
      author: r.owner?.login,
      signals: [`${r.stargazers_count ?? 0}★`, "recent activity"],
    }));
    return { hits, debug: { query: url, count: hits.length, sample: JSON.stringify(json.items?.[0] ?? {}).slice(0, 400) } };
  } catch {
    return { hits: [], debug: { query, error: "fetch failed" } };
  }
}

async function scanArxiv(keywords: string[]): Promise<{ hits: RawHit[]; debug: DebugInfo }> {
  // arXiv API expects field-scoped boolean queries, e.g. ti:foo+OR+abs:foo.
  // Passing a verbose sentence sorts by date and returns unrelated papers.
  const terms = keywords.slice(0, 4).map((k) => {
    const q = k.includes(" ") ? `%22${encodeURIComponent(k)}%22` : encodeURIComponent(k);
    return `(ti:${q}+OR+abs:${q})`;
  });
  const searchQuery = terms.join("+AND+");
  const url = `http://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=8&sortBy=relevance&sortOrder=descending`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { hits: [], debug: { query: url, status: res.status } };
    const xml = await res.text();
    const entries = xml.split("<entry>").slice(1);
    const hits = entries.slice(0, 8).map<RawHit>((e) => {
      const title = (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/\s+/g, " ").trim();
      const link = e.match(/<id>([\s\S]*?)<\/id>/)?.[1] || "";
      const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 240);
      const author = e.match(/<name>([\s\S]*?)<\/name>/)?.[1] || "";
      return {
        source: "arxiv" as const,
        title,
        url: link,
        snippet: summary,
        author,
        signals: ["preprint", "technical founder signal"],
      };
    });
    return { hits, debug: { query: url, count: hits.length, sample: xml.slice(0, 500) } };
  } catch {
    return { hits: [], debug: { query: url, error: "fetch failed" } };
  }
}

// LLM-scored relevance: single batched call returns 0-100 score + reason per hit
async function scoreRelevance(
  thesis: string,
  hits: RawHit[],
): Promise<Array<{ score: number; reason: string }>> {
  if (hits.length === 0) return [];
  const key = process.env.OPENAI_API_KEY;
  if (!key) return hits.map(() => ({ score: 50, reason: "no LLM key" }));
  try {
    const items = hits.map((h, i) => `[${i}] source=${h.source} title="${h.title}" snippet="${h.snippet.slice(0, 200)}"`).join("\n");
    const { output } = await generateText({
      model: chatModel({ structuredOutputs: true }),
      output: Output.object({
        schema: z.object({
          scores: z.array(z.object({
            index: z.number(),
            relevance: z.number().min(0).max(100),
            reason: z.string(),
          })),
        }),
      }),
      prompt: `You are scoring candidates for a VC's outbound sourcing radar. Rate 0-100 how relevant each item is as a potential technical founder / early signal for this thesis. 0 = totally unrelated topic. 100 = direct match on domain + technical founder signal. Be strict — off-topic papers/repos should score <20.\n\nTHESIS: ${thesis}\n\nCANDIDATES:\n${items}`,
    });
    const map = new Map(output.scores.map((s) => [s.index, s]));
    return hits.map((_, i) => {
      const s = map.get(i);
      return { score: s ? s.relevance / 100 : 0.3, reason: s?.reason ?? "unscored" };
    });
  } catch (e) {
    console.error("[outbound] scoring failed", e);
    return hits.map(() => ({ score: 0.3, reason: "scoring error" }));
  }
}

export const scanOutbound = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const thesis = [data.keyword, ...data.sectors, data.stage, data.geography].filter(Boolean).join(" ").trim() || "AI startup";
    const keywords = await extractKeywords(thesis);
    const [hn, gh, arx] = await Promise.all([
      scanHackerNews(keywords),
      scanGitHub(keywords),
      scanArxiv(keywords),
    ]);
    const allHits = [...hn.hits, ...gh.hits, ...arx.hits];
    const scores = await scoreRelevance(thesis, allHits);
    const scored: OutboundCandidate[] = allHits.map((h, i) => ({
      ...h,
      signalScore: scores[i]?.score ?? 0.3,
      relevanceReason: scores[i]?.reason,
    }));
    // Filter irrelevant (< 0.35) — real "no match" instead of noise
    const relevant = scored.filter((c) => c.signalScore >= 0.35).sort((a, b) => b.signalScore - a.signalScore);
    return {
      query: thesis,
      keywords,
      counts: { hackernews: hn.hits.length, github: gh.hits.length, arxiv: arx.hits.length },
      relevantCount: relevant.length,
      candidates: relevant.slice(0, 30),
      debug: { hackernews: hn.debug, github: gh.debug, arxiv: arx.debug },
    };
  });

export type ScanOutboundResult = Awaited<ReturnType<typeof scanOutbound>>;