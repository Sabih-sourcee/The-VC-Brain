
-- ============================================================
-- Founders (persistent identity across applications)
-- ============================================================
CREATE TABLE public.founders (
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founders TO authenticated;
GRANT ALL ON public.founders TO service_role;

ALTER TABLE public.founders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_all_anon" ON public.founders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "founders_all_auth" ON public.founders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Founder signals (append-only event log)
-- ============================================================
CREATE TABLE public.founder_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  source TEXT NOT NULL,          -- 'tavily' | 'github' | 'hn' | 'producthunt' | 'arxiv' | 'linkedin' | 'manual' | 'cold_start'
  signal_type TEXT NOT NULL,     -- 'reputation' | 'launch' | 'commit' | 'paper' | 'press' | 'complaint' | 'endorsement' | ...
  weight NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_url TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX founder_signals_founder_id_idx ON public.founder_signals(founder_id);
CREATE INDEX founder_signals_observed_at_idx ON public.founder_signals(observed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_signals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_signals TO authenticated;
GRANT ALL ON public.founder_signals TO service_role;

ALTER TABLE public.founder_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_signals_all_anon" ON public.founder_signals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "founder_signals_all_auth" ON public.founder_signals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Founder scores (persistent snapshot, trend derived from previous)
-- ============================================================
CREATE TABLE public.founder_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.founders(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL,        -- 0..100
  subscores JSONB NOT NULL DEFAULT '{}'::jsonb, -- { technical, execution, network, market_insight, resilience }
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.5, -- 0..1
  trend TEXT NOT NULL DEFAULT 'stable', -- 'improving' | 'stable' | 'declining'
  rationale TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX founder_scores_founder_id_idx ON public.founder_scores(founder_id);
CREATE INDEX founder_scores_computed_at_idx ON public.founder_scores(computed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_scores TO authenticated;
GRANT ALL ON public.founder_scores TO service_role;

ALTER TABLE public.founder_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_scores_all_anon" ON public.founder_scores FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "founder_scores_all_auth" ON public.founder_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- VC memory (replaces in-memory {VCName}.md)
-- ============================================================
CREATE TABLE public.vc_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vc_name, topic)
);

CREATE INDEX vc_memory_vc_name_idx ON public.vc_memory(vc_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vc_memory TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vc_memory TO authenticated;
GRANT ALL ON public.vc_memory TO service_role;

ALTER TABLE public.vc_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vc_memory_all_anon" ON public.vc_memory FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "vc_memory_all_auth" ON public.vc_memory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Screening scores (3 axes, per analysis run)
-- ============================================================
CREATE TABLE public.screening_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vc_name TEXT NOT NULL,
  company TEXT NOT NULL,
  founder_id UUID REFERENCES public.founders(id) ON DELETE SET NULL,
  founder_score NUMERIC(5, 2) NOT NULL,
  founder_trend TEXT NOT NULL DEFAULT 'stable',
  founder_rationale TEXT,
  market_score NUMERIC(5, 2) NOT NULL,
  market_stance TEXT NOT NULL DEFAULT 'neutral', -- 'bullish' | 'neutral' | 'bear'
  market_trend TEXT NOT NULL DEFAULT 'stable',
  market_rationale TEXT,
  idea_score NUMERIC(5, 2) NOT NULL,
  idea_survives_as_is BOOLEAN NOT NULL DEFAULT true,
  idea_trend TEXT NOT NULL DEFAULT 'stable',
  idea_rationale TEXT,
  recommendation TEXT NOT NULL DEFAULT 'diligence', -- 'recommend' | 'diligence' | 'pass'
  disagreement TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX screening_scores_lookup_idx ON public.screening_scores(vc_name, company, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_scores TO authenticated;
GRANT ALL ON public.screening_scores TO service_role;

ALTER TABLE public.screening_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screening_scores_all_anon" ON public.screening_scores FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "screening_scores_all_auth" ON public.screening_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Shared updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER founders_touch_updated_at
BEFORE UPDATE ON public.founders
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TRIGGER vc_memory_touch_updated_at
BEFORE UPDATE ON public.vc_memory
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
