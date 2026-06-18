
CREATE TABLE public.hermes_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  schedule_cron TEXT NOT NULL,
  schedule_label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_send BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_summary TEXT,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hermes_jobs_enabled_next ON public.hermes_jobs(enabled, next_run_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_jobs TO anon;
GRANT ALL ON public.hermes_jobs TO service_role;

ALTER TABLE public.hermes_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hermes_jobs read" ON public.hermes_jobs FOR SELECT USING (true);
CREATE POLICY "hermes_jobs write" ON public.hermes_jobs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_hermes_jobs_updated_at
  BEFORE UPDATE ON public.hermes_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hermes_job_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.hermes_jobs(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  trigger TEXT NOT NULL DEFAULT 'cron',
  dry_run BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'running',
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_succeeded INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hermes_job_runs_job_started ON public.hermes_job_runs(job_id, started_at DESC);
CREATE INDEX idx_hermes_job_runs_started_at ON public.hermes_job_runs(started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_job_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_job_runs TO anon;
GRANT ALL ON public.hermes_job_runs TO service_role;

ALTER TABLE public.hermes_job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hermes_job_runs read" ON public.hermes_job_runs FOR SELECT USING (true);
CREATE POLICY "hermes_job_runs write" ON public.hermes_job_runs FOR ALL USING (true) WITH CHECK (true);
