-- ============================================================
-- VC Brain — full schema for a FRESH Supabase project.
-- Paste this whole file into: Supabase dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------- Founders (persistent identity across applications) ----------
CREATE TABLE IF NOT EXISTS public.founders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  linkedin_url TEXT,
  github_handle TEXT,
  twitter_handle TEXT,
  personal_site TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Founder signals (append-only event log) ----------
CREATE TABLE IF NOT EXISTS public.founder_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  weight NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_url TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS founder_signals_founder_id_idx ON public.founder_signals(founder_id);
CREATE INDEX IF NOT EXISTS founder_signals_observed_at_idx ON public.founder_signals(observed_at DESC);

-- ---------- Founder scores (persistent snapshot, trend derived) ----------
CREATE TABLE IF NOT EXISTS public.founder_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL,
  subscores JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
  trend TEXT NOT NULL DEFAULT 'stable',
  rationale TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS founder_scores_founder_id_idx ON public.founder_scores(founder_id);
CREATE INDEX IF NOT EXISTS founder_scores_computed_at_idx ON public.founder_scores(computed_at DESC);

-- ---------- VC memory (per company summary) ----------
CREATE TABLE IF NOT EXISTS public.vc_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vc_name, topic)
);
CREATE INDEX IF NOT EXISTS vc_memory_vc_name_idx ON public.vc_memory(vc_name);

-- ---------- Screening scores (3 axes, per analysis run) ----------
CREATE TABLE IF NOT EXISTS public.screening_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_name TEXT NOT NULL,
  company TEXT NOT NULL,
  founder_id UUID REFERENCES public.founders(id) ON DELETE SET NULL,
  founder_score NUMERIC(5, 2) NOT NULL,
  founder_trend TEXT NOT NULL DEFAULT 'stable',
  founder_rationale TEXT,
  market_score NUMERIC(5, 2) NOT NULL,
  market_stance TEXT NOT NULL DEFAULT 'neutral',
  market_trend TEXT NOT NULL DEFAULT 'stable',
  market_rationale TEXT,
  idea_score NUMERIC(5, 2) NOT NULL,
  idea_survives_as_is BOOLEAN NOT NULL DEFAULT true,
  idea_trend TEXT NOT NULL DEFAULT 'stable',
  idea_rationale TEXT,
  recommendation TEXT NOT NULL DEFAULT 'diligence',
  disagreement TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS screening_scores_lookup_idx ON public.screening_scores(vc_name, company, created_at DESC);

-- ---------- RAG memory (pgvector) ----------
CREATE TABLE IF NOT EXISTS public.memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_name TEXT NOT NULL,
  company TEXT,
  founder_id UUID REFERENCES public.founders(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'research',
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memory_chunks_vc_idx ON public.memory_chunks(vc_name);
CREATE INDEX IF NOT EXISTS memory_chunks_company_idx ON public.memory_chunks(company);
CREATE INDEX IF NOT EXISTS memory_chunks_embedding_idx
  ON public.memory_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.match_memory_chunks(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 6,
  filter_vc TEXT DEFAULT NULL,
  filter_company TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, vc_name TEXT, company TEXT, founder_id UUID,
  kind TEXT, content TEXT, metadata JSONB, similarity FLOAT
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT mc.id, mc.vc_name, mc.company, mc.founder_id, mc.kind, mc.content, mc.metadata,
         1 - (mc.embedding <=> query_embedding) AS similarity
  FROM public.memory_chunks mc
  WHERE (filter_vc IS NULL OR mc.vc_name = filter_vc)
    AND (filter_company IS NULL OR mc.company = filter_company)
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS founders_touch_updated_at ON public.founders;
CREATE TRIGGER founders_touch_updated_at
BEFORE UPDATE ON public.founders
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS vc_memory_touch_updated_at ON public.vc_memory;
CREATE TRIGGER vc_memory_touch_updated_at
BEFORE UPDATE ON public.vc_memory
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ---------- Lock everything to service_role only ----------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'founders','founder_scores','founder_signals','screening_scores','vc_memory','memory_chunks'
  ]) LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
