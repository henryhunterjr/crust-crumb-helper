-- Q3 intent capture + nurture state on members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS intent_raw jsonb NULL,
  ADD COLUMN IF NOT EXISTS intent_tier text NULL,
  ADD COLUMN IF NOT EXISTS last_business_touch timestamptz NULL,
  ADD COLUMN IF NOT EXISTS business_touch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nurture_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_to_sys boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_to_sys_at timestamptz NULL;

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_intent_tier_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_intent_tier_check
  CHECK (intent_tier IS NULL OR intent_tier IN ('hobbyist','curious','prospect'));

ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_nurture_status_check;
ALTER TABLE public.members
  ADD CONSTRAINT members_nurture_status_check
  CHECK (nurture_status IN ('active','paused','opted_out','customer'));

CREATE INDEX IF NOT EXISTS members_intent_tier_idx
  ON public.members (intent_tier) WHERE intent_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_nurture_status_idx
  ON public.members (nurture_status);

-- Runs table for sync-market-curious + invite-to-sys
CREATE TABLE IF NOT EXISTS public.nurture_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL CHECK (job IN ('sync-market-curious','invite-to-sys')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  requested integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  dry_run boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','not_configured')),
  detail jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nurture_runs TO authenticated;
GRANT SELECT ON public.nurture_runs TO anon;
GRANT ALL ON public.nurture_runs TO service_role;

ALTER TABLE public.nurture_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nurture runs"
  ON public.nurture_runs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage nurture runs"
  ON public.nurture_runs FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS nurture_runs_job_started_idx
  ON public.nurture_runs (job, started_at DESC);