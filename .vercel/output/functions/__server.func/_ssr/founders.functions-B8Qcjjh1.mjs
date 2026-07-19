import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.mjs";
import { dt as number, ft as object, ht as string, rt as array } from "../_libs/@ai-sdk/gateway+[...].mjs";
import { t as chatModel } from "./ai-gateway.server-Bn4Y1mMp.mjs";
import { i as generateText, o as output_exports, t as NoObjectGeneratedError } from "../_libs/ai.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/founders.functions-B8Qcjjh1.js
var InputSchema = object({ query: string().min(1) });
var FilterSchema = object({
	keywords: array(string()),
	minScore: number(),
	geography: string(),
	sector: string(),
	signalTypes: array(string())
});
var searchFounders_createServerFn_handler = createServerRpc({
	id: "555eb6387865ed56ff2bc65b4f9ba61f40063273b85495f05747803874ad3952",
	name: "searchFounders",
	filename: "src/lib/founders.functions.ts"
}, (opts) => searchFounders.__executeServer(opts));
var searchFounders = createServerFn({ method: "POST" }).inputValidator((input) => InputSchema.parse(input)).handler(searchFounders_createServerFn_handler, async ({ data }) => {
	if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	let filters = {
		keywords: [],
		minScore: 0,
		geography: "",
		sector: "",
		signalTypes: []
	};
	try {
		const { output } = await generateText({
			model: chatModel({ structuredOutputs: true }),
			output: output_exports.object({ schema: FilterSchema }),
			system: "Extract structured filters from a VC's natural-language founder search. Empty strings and empty arrays are OK when the query doesn't mention that attribute. keywords should be technical/domain terms (e.g. 'AI infra', 'vector db'). minScore is 0-100.",
			prompt: data.query
		});
		filters = output;
	} catch (err) {
		if (NoObjectGeneratedError.isInstance(err)) try {
			filters = FilterSchema.parse(JSON.parse(err.text ?? "{}"));
		} catch {}
	}
	const { data: founders } = await supabaseAdmin.from("founders").select("id, name, bio, linkedin_url, github_handle, twitter_handle").limit(200);
	if (!founders || founders.length === 0) return {
		query: data.query,
		filters,
		matches: []
	};
	const founderIds = founders.map((f) => f.id);
	const [{ data: scores }, { data: signals }, { data: screenings }] = await Promise.all([
		supabaseAdmin.from("founder_scores").select("founder_id, score, trend, rationale, computed_at").in("founder_id", founderIds).order("computed_at", { ascending: false }),
		supabaseAdmin.from("founder_signals").select("founder_id, source, signal_type, payload, evidence_url").in("founder_id", founderIds).limit(500),
		supabaseAdmin.from("screening_scores").select("founder_id, vc_name, company, recommendation, created_at").in("founder_id", founderIds).order("created_at", { ascending: false })
	]);
	const latestScoreMap = /* @__PURE__ */ new Map();
	for (const s of scores ?? []) if (!latestScoreMap.has(s.founder_id)) latestScoreMap.set(s.founder_id, {
		score: Number(s.score),
		trend: s.trend,
		rationale: s.rationale
	});
	const signalMap = /* @__PURE__ */ new Map();
	for (const sig of signals ?? []) {
		const arr = signalMap.get(sig.founder_id) ?? [];
		const payload = sig.payload ?? {};
		arr.push({
			source: sig.source,
			snippet: payload.title || payload.snippet || sig.signal_type,
			url: sig.evidence_url
		});
		signalMap.set(sig.founder_id, arr);
	}
	const screeningMap = /* @__PURE__ */ new Map();
	for (const s of screenings ?? []) {
		if (!s.founder_id) continue;
		const arr = screeningMap.get(s.founder_id) ?? [];
		arr.push({
			vc: s.vc_name,
			company: s.company,
			recommendation: s.recommendation,
			createdAt: s.created_at
		});
		screeningMap.set(s.founder_id, arr);
	}
	const preFiltered = founders.map((f) => {
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
			screenings: screeningMap.get(f.id) ?? []
		};
	}).filter((e) => e.latestScore == null || e.latestScore >= filters.minScore);
	const RankSchema = object({ matches: array(object({
		founderId: string(),
		relevance: number(),
		reason: string()
	})) });
	let ranked = [];
	if (preFiltered.length > 0) {
		const catalog = preFiltered.slice(0, 60).map((e) => ({
			founderId: e.founderId,
			name: e.name,
			latestScore: e.latestScore,
			rationale: e.rationale,
			signals: e.signals.map((s) => s.snippet).slice(0, 3),
			screenings: e.screenings.slice(0, 3).map((s) => `${s.company} (${s.recommendation})`)
		}));
		try {
			const { output } = await generateText({
				model: chatModel({ structuredOutputs: true }),
				output: output_exports.object({ schema: RankSchema }),
				system: "Score each founder 0-100 on how well they match the VC's natural-language query. Only return founders scoring >= 40. Include a short reason grounded in their signals/screenings/rationale.",
				prompt: `VC query: "${data.query}"\nExtracted filters: ${JSON.stringify(filters)}\n\nFounder catalog:\n${JSON.stringify(catalog, null, 2)}`
			});
			ranked = output.matches;
		} catch (err) {
			if (NoObjectGeneratedError.isInstance(err)) try {
				ranked = RankSchema.parse(JSON.parse(err.text ?? "{}")).matches;
			} catch {
				ranked = [];
			}
		}
	}
	const enrichedById = new Map(preFiltered.map((e) => [e.founderId, e]));
	const matches = ranked.map((r) => {
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
			reason: r.reason
		};
	}).filter((x) => x !== null).sort((a, b) => b.relevance - a.relevance);
	return {
		query: data.query,
		filters,
		matches
	};
});
//#endregion
export { searchFounders_createServerFn_handler };
