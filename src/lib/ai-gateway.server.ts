import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// ============================================================
// Direct OpenAI provider (replaces the Lovable AI gateway).
// OpenAI's REST API is the reference OpenAI-compatible API, so we can reuse
// @ai-sdk/openai-compatible and avoid adding a new dependency.
// ============================================================

// Chat/reasoning + judge model. "gpt-4o-mini" is the cost-effective reasoning
// model used for the sourcing agent, the memory condenser, the validator, and
// the final assessment judge.
export const CHAT_MODEL = "gpt-4o-mini";
// Embedding model for the RAG memory layer (1536 dims -> matches pgvector col).
export const EMBED_MODEL = "text-embedding-3-small";

function openaiProvider(structuredOutputs: boolean) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    apiKey,
    supportsStructuredOutputs: structuredOutputs,
  });
}

/** Chat model. Pass { structuredOutputs: true } for Output.object schemas. */
export function chatModel(options?: { structuredOutputs?: boolean }) {
  return openaiProvider(options?.structuredOutputs ?? false)(CHAT_MODEL);
}

/** Text-embedding model for the RAG memory layer. */
export function embeddingModel() {
  return openaiProvider(false).textEmbeddingModel(EMBED_MODEL);
}
