
-- Add response tracking columns to outreach_messages
ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS responded BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_status_at_send TEXT,
  ADD COLUMN IF NOT EXISTS engagement_status_7d_later TEXT,
  ADD COLUMN IF NOT EXISTS template_type TEXT;

-- Create segment_snapshots table
CREATE TABLE IF NOT EXISTS public.segment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  segment_name TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_segment_snapshots_date ON public.segment_snapshots(snapshot_date);

ALTER TABLE public.segment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.segment_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Create campaign_analytics table
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.content_campaigns(id) ON DELETE CASCADE,
  estimated_participants INTEGER DEFAULT 0,
  photos_shared INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  new_members_during INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.campaign_analytics FOR ALL USING (true) WITH CHECK (true);
