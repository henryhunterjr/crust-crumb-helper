-- Drop short-lived MailerLite event log
DROP TABLE IF EXISTS public.nurture_events;

-- Members: drip progress + unsubscribe token
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS nurture_step int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nurture_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_unsubscribe_token
  ON public.members (unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;

-- Constrain nurture_step to 0..6
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'members_nurture_step_range'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT members_nurture_step_range CHECK (nurture_step >= 0 AND nurture_step <= 6);
  END IF;
END$$;

-- Extend nurture_runs for per-send rows. Existing job-summary columns stay,
-- so both row shapes coexist; differentiate by member_id IS NOT NULL.
ALTER TABLE public.nurture_runs
  ADD COLUMN IF NOT EXISTS member_id uuid NULL REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS step int NULL,
  ADD COLUMN IF NOT EXISTS subject text NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS resend_message_id text NULL,
  ADD COLUMN IF NOT EXISTS error text NULL;

CREATE INDEX IF NOT EXISTS idx_nurture_runs_member_step
  ON public.nurture_runs (member_id, step);
CREATE INDEX IF NOT EXISTS idx_nurture_runs_sent_at
  ON public.nurture_runs (sent_at DESC);