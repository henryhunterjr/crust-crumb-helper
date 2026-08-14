-- Restore the admin-only security posture that was accidentally reopened by
-- 20260419135211 and later roster migrations. This migration is deliberately
-- additive/non-destructive: it changes policies and adds an event ledger.

DO $$
DECLARE
  t text;
  app_tables text[] := ARRAY[
    'action_items','activity_feed','ai_personality_settings','brief_logs',
    'calendar_entries','calendar_templates','campaign_analytics','campaign_posts',
    'classroom_resources','community_pulse_runs','content_campaigns','content_ideas',
    'course_modules','dm_templates','draft_replies','email_campaigns','email_drafts',
    'email_subscribers','interest_mappings','member_tags','members','morning_posts',
    'outreach_messages','outreach_rules','post_ideas','quick_responses','recipes',
    'roster_sync_runs','scheduled_posts','segment_snapshots','url_health_checks',
    'weekly_goals','weekly_reports','youtube_videos','blog_posts'
  ];
BEGIN
  FOREACH t IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'DEV public full access', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all for single user tool', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all operations for single user tool', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admins full access', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated ' ||
        'USING (public.has_role(auth.uid(), ''admin'')) ' ||
        'WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        'Admins full access', t
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.members, public.outreach_messages, public.roster_sync_runs FROM anon;

CREATE TABLE IF NOT EXISTS public.skooly_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  community_slug text,
  member_name text,
  member_handle text,
  received_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz,
  processed_at timestamptz,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','processed','ignored','failed')),
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_skooly_events_received
  ON public.skooly_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_skooly_events_member
  ON public.skooly_webhook_events(lower(member_handle), lower(member_name));

ALTER TABLE public.skooly_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full access" ON public.skooly_webhook_events;
CREATE POLICY "Admins full access" ON public.skooly_webhook_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON TABLE public.skooly_webhook_events FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.skooly_webhook_events TO authenticated, service_role;
