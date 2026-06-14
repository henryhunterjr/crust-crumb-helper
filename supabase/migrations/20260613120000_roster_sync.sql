-- P0: automatic Skool roster read.
-- Adds non-destructive reconciliation columns to members and a log table for
-- each scheduled sync run. Nothing here deletes member data; drift is flagged
-- so Henry decides what to do with it.

-- 1. Reconciliation columns on members ------------------------------------
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS skool_username TEXT,
  ADD COLUMN IF NOT EXISTS roster_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS roster_last_seen_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS message_status TEXT DEFAULT 'not_contacted';

-- roster_status values:
--   'on_roster'           -- present in the most recent full roster read
--   'missing_from_roster' -- was known, no longer appears (left or removed)
--   'unknown'             -- never reconciled (e.g. imported before P0)
COMMENT ON COLUMN public.members.roster_status IS
  'on_roster | missing_from_roster | unknown. Set by the ingest-roster sync. Never auto-deleted.';
COMMENT ON COLUMN public.members.roster_last_seen_at IS
  'Last time this member was seen in a Skool roster read.';

CREATE INDEX IF NOT EXISTS idx_members_roster_status
  ON public.members(roster_status);
CREATE INDEX IF NOT EXISTS idx_members_skool_username
  ON public.members(skool_username);

-- 2. Roster sync run log ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT,
  source TEXT DEFAULT 'browser-agent',
  full_roster BOOLEAN DEFAULT FALSE,
  captured_at TIMESTAMP WITH TIME ZONE,
  total_seen INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  missing_flagged INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed', -- completed | partial | failed
  error TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.roster_sync_runs ENABLE ROW LEVEL SECURITY;

-- Single-operator tool: same permissive policy the other tables use. Writes
-- in practice come from the edge function via the service role key.
CREATE POLICY "Allow all operations for single user tool"
  ON public.roster_sync_runs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_roster_sync_runs_created_at
  ON public.roster_sync_runs(created_at DESC);
