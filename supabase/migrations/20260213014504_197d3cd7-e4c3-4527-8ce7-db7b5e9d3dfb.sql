
-- Add missing columns to email_subscribers
ALTER TABLE public.email_subscribers 
ADD COLUMN IF NOT EXISTS subscription_time timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_time timestamptz,
ADD COLUMN IF NOT EXISTS list_name text;

-- Create email_campaigns table
CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'recruitment',
  target_segment text NOT NULL DEFAULT 'non_members',
  status text NOT NULL DEFAULT 'draft',
  email_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for single user tool"
ON public.email_campaigns FOR ALL
USING (true) WITH CHECK (true);

-- Create email_drafts table
CREATE TABLE public.email_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id uuid REFERENCES public.email_subscribers(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  personalization_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for single user tool"
ON public.email_drafts FOR ALL
USING (true) WITH CHECK (true);

CREATE TRIGGER update_email_campaigns_updated_at
BEFORE UPDATE ON public.email_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_drafts_updated_at
BEFORE UPDATE ON public.email_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_email_drafts_campaign_id ON public.email_drafts(campaign_id);
CREATE INDEX idx_email_drafts_status ON public.email_drafts(status);
