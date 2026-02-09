
-- Add message_status to members table
ALTER TABLE public.members 
ADD COLUMN message_status text NOT NULL DEFAULT 'not_contacted';

-- Migrate existing data based on current boolean fields
UPDATE public.members 
SET message_status = CASE
  WHEN outreach_responded = true THEN 'replied'
  WHEN outreach_sent = true THEN 'sent'
  ELSE 'not_contacted'
END;

-- Create outreach_messages table for message logging
CREATE TABLE public.outreach_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  message_type text NOT NULL DEFAULT 'custom',
  message_text text NOT NULL,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  custom_topic text
);

-- Enable RLS
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

-- Single-user tool — allow all operations
CREATE POLICY "Allow all operations for single user tool"
ON public.outreach_messages
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_outreach_messages_member_id ON public.outreach_messages(member_id);
CREATE INDEX idx_outreach_messages_created_at ON public.outreach_messages(created_at DESC);
CREATE INDEX idx_outreach_messages_status ON public.outreach_messages(status);
CREATE INDEX idx_outreach_messages_message_type ON public.outreach_messages(message_type);
