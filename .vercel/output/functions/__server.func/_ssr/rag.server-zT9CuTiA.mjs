import { n as embeddingModel } from "./ai-gateway.server-Bn4Y1mMp.mjs";
import { n as embed, r as embedMany } from "../_libs/ai.mjs";
import { supabaseAdmin } from "./client.server-Bw6iWMJ-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rag.server-zT9CuTiA.js
async function embedText(text) {
	const { embedding } = await embed({
		model: embeddingModel(),
		value: text.slice(0, 8e3)
	});
	return embedding;
}
/**
* Semantic recall from the memory_chunks vector store.
* Returns the top-k matching chunks plus the best similarity score, which the
* Memory agent uses to decide whether stored knowledge is fresh/rich enough.
*/
async function retrieveMemory(params) {
	const query_embedding = await embedText(params.queryText);
	const { data, error } = await supabaseAdmin.rpc("match_memory_chunks", {
		query_embedding,
		match_count: params.k ?? 6,
		filter_vc: params.vcName,
		filter_company: params.company ?? null
	});
	if (error) {
		console.error("[rag] match_memory_chunks error", error);
		return {
			chunks: [],
			topSimilarity: 0
		};
	}
	const chunks = data ?? [];
	return {
		chunks,
		topSimilarity: chunks.reduce((m, c) => Math.max(m, c.similarity ?? 0), 0)
	};
}
/** Embed + persist research chunks into the vector store (token-optimized memory). */
async function saveMemoryChunks(params) {
	const clean = params.chunks.map((c) => ({
		...c,
		content: c.content.trim()
	})).filter((c) => c.content.length > 0);
	if (clean.length === 0) return 0;
	const { embeddings } = await embedMany({
		model: embeddingModel(),
		values: clean.map((c) => c.content.slice(0, 8e3))
	});
	const rows = clean.map((c, i) => ({
		vc_name: params.vcName,
		company: params.company ?? null,
		founder_id: params.founderId ?? null,
		kind: c.kind ?? "research",
		content: c.content.slice(0, 8e3),
		embedding: embeddings[i],
		metadata: c.metadata ?? {}
	}));
	const { error } = await supabaseAdmin.from("memory_chunks").insert(rows);
	if (error) {
		console.error("[rag] saveMemoryChunks insert error", error);
		return 0;
	}
	return rows.length;
}
//#endregion
export { retrieveMemory, saveMemoryChunks };
