-- Create members table for engagement tracking
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skool_name TEXT NOT NULL,
  email TEXT,
  join_date DATE,
  application_answer TEXT,
  post_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  last_active DATE,
  engagement_status TEXT DEFAULT 'unknown',
  outreach_sent BOOLEAN DEFAULT FALSE,
  outreach_sent_at TIMESTAMP WITH TIME ZONE,
  outreach_responded BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policy for single user tool
CREATE POLICY "Allow all operations for single user tool"
  ON public.members FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX idx_members_status ON public.members(engagement_status);
CREATE INDEX idx_members_join_date ON public.members(join_date);
CREATE INDEX idx_members_outreach ON public.members(outreach_sent);

-- Add trigger for updated_at
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();