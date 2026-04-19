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
    'scheduled_posts','segment_snapshots','url_health_checks','weekly_goals','weekly_reports'
  ];
BEGIN
  FOREACH t IN ARRAY app_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'DEV public full access', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)',
      'DEV public full access', t
    );
  END LOOP;
END $$;