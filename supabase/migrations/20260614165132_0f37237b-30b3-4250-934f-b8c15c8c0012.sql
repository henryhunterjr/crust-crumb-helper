ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS skool_username TEXT,
  ADD COLUMN IF NOT EXISTS roster_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS roster_last_seen_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS message_status TEXT DEFAULT 'not_contacted';

COMMENT ON COLUMN public.members.roster_status IS
  'on_roster | missing_from_roster | unknown. Set by the ingest-roster sync. Never auto-deleted.';
COMMENT ON COLUMN public.members.roster_last_seen_at IS
  'Last time this member was seen in a Skool roster read.';

CREATE INDEX IF NOT EXISTS idx_members_roster_status ON public.members(roster_status);
CREATE INDEX IF NOT EXISTS idx_members_skool_username ON public.members(skool_username);

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
  status TEXT DEFAULT 'completed',
  error TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_sync_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roster_sync_runs TO anon;
GRANT ALL ON public.roster_sync_runs TO service_role;

ALTER TABLE public.roster_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for single user tool"
  ON public.roster_sync_runs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_roster_sync_runs_created_at
  ON public.roster_sync_runs(created_at DESC);