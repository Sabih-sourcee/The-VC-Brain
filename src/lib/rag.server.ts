// Server-only RAG memory layer for VC Brain.
// Embeds research into pgvector (memory_chunks) and retrieves it by semantic
// similarity so the Memory agent can answer "do we already know this company?"
// without re-running the whole Sourcing pipeline.
//
// Import this ONLY via dynamic import() inside server-fn handlers, never at the
// top level of a *.functions.ts file (it pulls in the service-role client).
import { embed, embedMany } from "ai";
import { embeddingModel } from "./ai-gateway.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

export type MemoryChunk = {
  id: string;
  vc_name: string;
  company: string | null;
  founder_id: string | null;
  kind: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type ChunkInput = {
  content: string;
  kind?: "research" | "founder" | "assessment" | "note";
  metadata?: Record<string, unknown>;
};

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel(),
    value: text.slice(0, 8000),
  });
  return embedding;
}

/**
 * Semantic recall from the memory_chunks vector store.
 * Returns the top-k matching chunks plus the best similarity score, which the
 * Memory agent uses to decide whether stored knowledge is fresh/rich enough.
 */
export async function retrieveMemory(params: {
  vcName: string;
  company?: string;
  queryText: string;
  k?: number;
}): Promise<{ chunks: MemoryChunk[]; topSimilarity: number }> {
  const query_embedding = await embedText(params.queryText);
  // rpc + custom table aren't in the generated types yet — cast through unknown.
  const { data, error } = await (supabaseAdmin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: MemoryChunk[] | null; error: unknown }>)("match_memory_chunks", {
    query_embedding,
    match_count: params.k ?? 6,
    filter_vc: params.vcName,
    filter_company: params.company ?? null,
  });
  if (error) {
    console.error("[rag] match_memory_chunks error", error);
    return { chunks: [], topSimilarity: 0 };
  }
  const chunks = data ?? [];
  const topSimilarity = chunks.reduce((m, c) => Math.max(m, c.similarity ?? 0), 0);
  return { chunks, topSimilarity };
}

/** Embed + persist research chunks into the vector store (token-optimized memory). */
export async function saveMemoryChunks(params: {
  vcName: string;
  company?: string | null;
  founderId?: string | null;
  chunks: ChunkInput[];
}): Promise<number> {
  const clean = params.chunks
    .map((c) => ({ ...c, content: c.content.trim() }))
    .filter((c) => c.content.length > 0);
  if (clean.length === 0) return 0;

  const { embeddings } = await embedMany({
    model: embeddingModel(),
    values: clean.map((c) => c.content.slice(0, 8000)),
  });

  const rows = clean.map((c, i) => ({
    vc_name: params.vcName,
    company: params.company ?? null,
    founder_id: params.founderId ?? null,
    kind: c.kind ?? "research",
    content: c.content.slice(0, 8000),
    embedding: embeddings[i],
    metadata: c.metadata ?? {},
  }));

  const { error } = await (supabaseAdmin.from as unknown as (
    t: string,
  ) => { insert: (r: unknown) => Promise<{ error: unknown }> })("memory_chunks").insert(rows);
  if (error) {
    console.error("[rag] saveMemoryChunks insert error", error);
    return 0;
  }
  return rows.length;
}
