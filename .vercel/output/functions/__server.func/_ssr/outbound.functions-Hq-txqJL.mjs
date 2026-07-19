import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.mjs";
import { dt as number, ft as object, ht as string, rt as array } from "../_libs/@ai-sdk/gateway+[...].mjs";
import { t as chatModel } from "./ai-gateway.server-Bn4Y1mMp.mjs";
import { i as generateText, o as output_exports } from "../_libs/ai.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/outbound.functions-Hq-txqJL.js
var InputSchema = object({
	sectors: array(string()).default([]),
	stage: string().default("Seed"),
	geography: string().default(""),
	keyword: string().default("")
});
async function extractKeywords(thesis) {
	if (!process.env.OPENAI_API_KEY) return thesis.split(/[\s,]+/).filter((w) => w.length > 3).slice(0, 5);
	try {
		const { output } = await generateText({
			model: chatModel({ structuredOutputs: true }),
			output: output_exports.object({ schema: object({ keywords: array(string()).min(2).max(6) }) }),
			prompt: `Extract 3-5 short technical keyword phrases (1-3 words each) suitable for searching arXiv / GitHub / HackerNews from this VC thesis. Return distinct terms that would surface technical founders/papers/projects. Avoid generic words like "startup", "AI", "company".\n\nThesis: ${thesis}`
		});
		return output.keywords.map((k) => k.trim()).filter(Boolean);
	} catch (e) {
		console.error("[outbound] keyword extraction failed", e);
		return thesis.split(/[\s,]+/).filter((w) => w.length > 3).slice(0, 5);
	}
}
async function scanHackerNews(keywords) {
	const query = keywords.slice(0, 3).join(" ");
	try {
		const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=8`;
		const res = await fetch(url);
		if (!res.ok) return {
			hits: [],
			debug: {
				query: url,
				status: res.status
			}
		};
		const json = await res.json();
		const hits = (json.hits ?? []).filter((h) => h.title).map((h) => ({
			source: "hackernews",
			title: h.title || "",
			url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
			snippet: (h.story_text ?? "").slice(0, 240),
			author: h.author,
			signals: [`${h.points ?? 0} pts on HN`, "self-launch signal"]
		}));
		return {
			hits,
			debug: {
				query: url,
				count: hits.length,
				sample: JSON.stringify(json.hits?.[0] ?? {}).slice(0, 400)
			}
		};
	} catch {
		return {
			hits: [],
			debug: {
				query,
				error: "fetch failed"
			}
		};
	}
}
async function scanGitHub(keywords) {
	const query = keywords.slice(0, 4).map((k) => `"${k}"`).join(" OR ");
	try {
		const q = `${query} stars:>50 pushed:>2024-01-01`;
		const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=8`;
		const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
		if (!res.ok) return {
			hits: [],
			debug: {
				query: url,
				status: res.status
			}
		};
		const json = await res.json();
		const hits = (json.items ?? []).map((r) => ({
			source: "github",
			title: r.full_name || "",
			url: r.html_url || "",
			snippet: r.description || "",
			author: r.owner?.login,
			signals: [`${r.stargazers_count ?? 0}★`, "recent activity"]
		}));
		return {
			hits,
			debug: {
				query: url,
				count: hits.length,
				sample: JSON.stringify(json.items?.[0] ?? {}).slice(0, 400)
			}
		};
	} catch {
		return {
			hits: [],
			debug: {
				query,
				error: "fetch failed"
			}
		};
	}
}
async function scanArxiv(keywords) {
	const url = `http://export.arxiv.org/api/query?search_query=${keywords.slice(0, 4).map((k) => {
		const q = k.includes(" ") ? `%22${encodeURIComponent(k)}%22` : encodeURIComponent(k);
		return `(ti:${q}+OR+abs:${q})`;
	}).join("+AND+")}&start=0&max_results=8&sortBy=relevance&sortOrder=descending`;
	try {
		const res = await fetch(url);
		if (!res.ok) return {
			hits: [],
			debug: {
				query: url,
				status: res.status
			}
		};
		const xml = await res.text();
		const hits = xml.split("<entry>").slice(1).slice(0, 8).map((e) => {
			return {
				source: "arxiv",
				title: (e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/\s+/g, " ").trim(),
				url: e.match(/<id>([\s\S]*?)<\/id>/)?.[1] || "",
				snippet: (e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 240),
				author: e.match(/<name>([\s\S]*?)<\/name>/)?.[1] || "",
				signals: ["preprint", "technical founder signal"]
			};
		});
		return {
			hits,
			debug: {
				query: url,
				count: hits.length,
				sample: xml.slice(0, 500)
			}
		};
	} catch {
		return {
			hits: [],
			debug: {
				query: url,
				error: "fetch failed"
			}
		};
	}
}
async function scoreRelevance(thesis, hits) {
	if (hits.length === 0) return [];
	if (!process.env.OPENAI_API_KEY) return hits.map(() => ({
		score: 50,
		reason: "no LLM key"
	}));
	try {
		const items = hits.map((h, i) => `[${i}] source=${h.source} title="${h.title}" snippet="${h.snippet.slice(0, 200)}"`).join("\n");
		const { output } = await generateText({
			model: chatModel({ structuredOutputs: true }),
			output: output_exports.object({ schema: object({ scores: array(object({
				index: number(),
				relevance: number().min(0).max(100),
				reason: string()
			})) }) }),
			prompt: `You are scoring candidates for a VC's outbound sourcing radar. Rate 0-100 how relevant each item is as a potential technical founder / early signal for this thesis. 0 = totally unrelated topic. 100 = direct match on domain + technical founder signal. Be strict — off-topic papers/repos should score <20.\n\nTHESIS: ${thesis}\n\nCANDIDATES:\n${items}`
		});
		const map = new Map(output.scores.map((s) => [s.index, s]));
		return hits.map((_, i) => {
			const s = map.get(i);
			return {
				score: s ? s.relevance / 100 : .3,
				reason: s?.reason ?? "unscored"
			};
		});
	} catch (e) {
		console.error("[outbound] scoring failed", e);
		return hits.map(() => ({
			score: .3,
			reason: "scoring error"
		}));
	}
}
var scanOutbound_createServerFn_handler = createServerRpc({
	id: "a4a9ff656d01f951d1d127b3df5142dda40742466a19c214d44efa4c956d0129",
	name: "scanOutbound",
	filename: "src/lib/outbound.functions.ts"
}, (opts) => scanOutbound.__executeServer(opts));
var scanOutbound = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema.parse(input)).handler(scanOutbound_createServerFn_handler, async ({ data }) => {
	const thesis = [
		data.keyword,
		...data.sectors,
		data.stage,
		data.geography
	].filter(Boolean).join(" ").trim() || "AI startup";
	const keywords = await extractKeywords(thesis);
	const [hn, gh, arx] = await Promise.all([
		scanHackerNews(keywords),
		scanGitHub(keywords),
		scanArxiv(keywords)
	]);
	const allHits = [
		...hn.hits,
		...gh.hits,
		...arx.hits
	];
	const scores = await scoreRelevance(thesis, allHits);
	const relevant = allHits.map((h, i) => ({
		...h,
		signalScore: scores[i]?.score ?? .3,
		relevanceReason: scores[i]?.reason
	})).filter((c) => c.signalScore >= .35).sort((a, b) => b.signalScore - a.signalScore);
	return {
		query: thesis,
		keywords,
		counts: {
			hackernews: hn.hits.length,
			github: gh.hits.length,
			arxiv: arx.hits.length
		},
		relevantCount: relevant.length,
		candidates: relevant.slice(0, 30),
		debug: {
			hackernews: hn.debug,
			github: gh.debug,
			arxiv: arx.debug
		}
	};
});
//#endregion
export { scanOutbound_createServerFn_handler };
