CREATE TABLE public.nurture_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  subscriber_email text,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  campaign_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  process_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nurture_events TO authenticated;
GRANT ALL ON public.nurture_events TO service_role;

ALTER TABLE public.nurture_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read nurture events"
  ON public.nurture_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages nurture events"
  ON public.nurture_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_nurture_events_email ON public.nurture_events (lower(subscriber_email));
CREATE INDEX idx_nurture_events_received_at ON public.nurture_events (received_at DESC);
CREATE INDEX idx_nurture_events_type ON public.nurture_events (event_type);