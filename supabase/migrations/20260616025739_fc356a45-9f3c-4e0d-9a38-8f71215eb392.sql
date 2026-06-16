CREATE TABLE public.sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'bread-authority',
  status TEXT NOT NULL DEFAULT 'running',
  dry_run BOOLEAN NOT NULL DEFAULT false,
  topics_seen INTEGER NOT NULL DEFAULT 0,
  entries_seen INTEGER NOT NULL DEFAULT 0,
  inserted JSONB NOT NULL DEFAULT '{}'::jsonb,
  skipped JSONB NOT NULL DEFAULT '{}'::jsonb,
  deltas JSONB NOT NULL DEFAULT '{}'::jsonb,
  topic_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_runs_started_at ON public.sync_runs(started_at DESC);
CREATE INDEX idx_sync_runs_source_status ON public.sync_runs(source, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_runs TO authenticated;
GRANT SELECT ON public.sync_runs TO anon;
GRANT ALL ON public.sync_runs TO service_role;

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_runs read" ON public.sync_runs FOR SELECT USING (true);
CREATE POLICY "sync_runs write" ON public.sync_runs FOR ALL USING (true) WITH CHECK (true);
