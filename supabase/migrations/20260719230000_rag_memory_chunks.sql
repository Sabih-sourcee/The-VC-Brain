-- ============================================================
-- RAG memory layer: pgvector store + semantic match function.
-- Turns the Memory agent from "just API calling" into real retrieval:
-- research is embedded and recalled by cosine similarity.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_name TEXT NOT NULL,
  company TEXT,
  founder_id UUID REFERENCES public.founders(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'research',   -- 'research' | 'founder' | 'assessment' | 'note'
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,         -- text-embedding-3-small
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_chunks_vc_idx ON public.memory_chunks(vc_name);
CREATE INDEX IF NOT EXISTS memory_chunks_company_idx ON public.memory_chunks(company);
CREATE INDEX IF NOT EXISTS memory_chunks_embedding_idx
  ON public.memory_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- service_role only (all access is via server functions using supabaseAdmin)
REVOKE ALL ON public.memory_chunks FROM anon, authenticated;
GRANT ALL ON public.memory_chunks TO service_role;
ALTER TABLE public.memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_chunks FORCE ROW LEVEL SECURITY;

-- Cosine-similarity match, optionally scoped to a VC and/or company.
CREATE OR REPLACE FUNCTION public.match_memory_chunks(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 6,
  filter_vc TEXT DEFAULT NULL,
  filter_company TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  vc_name TEXT,
  company TEXT,
  founder_id UUID,
  kind TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    mc.id, mc.vc_name, mc.company, mc.founder_id, mc.kind, mc.content, mc.metadata,
    1 - (mc.embedding <=> query_embedding) AS similarity
  FROM public.memory_chunks mc
  WHERE (filter_vc IS NULL OR mc.vc_name = filter_vc)
    AND (filter_company IS NULL OR mc.company = filter_company)
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
$$;
