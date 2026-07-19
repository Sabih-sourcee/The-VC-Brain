import { t as createOpenAICompatible } from "../_libs/ai-sdk__openai-compatible.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ai-gateway.server-Bn4Y1mMp.js
var CHAT_MODEL = "gpt-4o-mini";
var EMBED_MODEL = "text-embedding-3-small";
function openaiProvider(structuredOutputs) {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
	return createOpenAICompatible({
		name: "openai",
		baseURL: "https://api.openai.com/v1",
		apiKey,
		supportsStructuredOutputs: structuredOutputs
	});
}
/** Chat model. Pass { structuredOutputs: true } for Output.object schemas. */
function chatModel(options) {
	return openaiProvider(options?.structuredOutputs ?? false)(CHAT_MODEL);
}
/** Text-embedding model for the RAG memory layer. */
function embeddingModel() {
	return openaiProvider(false).textEmbeddingModel(EMBED_MODEL);
}
//#endregion
export { embeddingModel as n, chatModel as t };
