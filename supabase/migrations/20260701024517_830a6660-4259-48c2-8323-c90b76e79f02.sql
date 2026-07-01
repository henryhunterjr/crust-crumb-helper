
CREATE TABLE public.outreach_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.outreach_templates(id) ON DELETE SET NULL,
  template_key TEXT,
  segment_key TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('dm','email')),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_skool_username TEXT,
  recipient_name TEXT,
  rendered_subject TEXT,
  rendered_body TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','delivered','responded','skipped','canceled')),
  error TEXT,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('api','ui','hermes','system')),
  triggered_by_user TEXT,
  batch_id UUID,
  external_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_sends_status ON public.outreach_sends(status);
CREATE INDEX idx_outreach_sends_template ON public.outreach_sends(template_id, created_at DESC);
CREATE INDEX idx_outreach_sends_member ON public.outreach_sends(member_id, created_at DESC);
CREATE INDEX idx_outreach_sends_batch ON public.outreach_sends(batch_id);
CREATE INDEX idx_outreach_sends_channel_status ON public.outreach_sends(channel, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_sends TO authenticated;
GRANT ALL ON public.outreach_sends TO service_role;

ALTER TABLE public.outreach_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outreach_sends"
  ON public.outreach_sends
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_outreach_sends_updated_at
  BEFORE UPDATE ON public.outreach_sends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
