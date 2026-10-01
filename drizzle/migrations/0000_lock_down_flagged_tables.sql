-- Drop every permissive (USING true / WITH CHECK true) policy flagged by the security scan
DO $$
DECLARE
  t text;
  dev_tables text[] := ARRAY[
    'action_items','activity_feed','ai_personality_settings','blog_posts','brief_logs',
    'calendar_entries','calendar_templates','campaign_analytics','campaign_posts',
    'classroom_resources','community_pulse_runs','content_campaigns','content_ideas',
    'course_modules','dm_templates','draft_replies','email_campaigns','interest_mappings',
    'member_tags','morning_posts','outreach_rules','post_ideas','quick_responses',
    'recipes','scheduled_posts','segment_snapshots','url_health_checks','weekly_goals',
    'weekly_reports','youtube_videos'
  ];
BEGIN
  FOREACH t IN ARRAY dev_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "DEV public full access" ON public.%I', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "hermes_jobs read" ON public.hermes_jobs;
DROP POLICY IF EXISTS "hermes_jobs write" ON public.hermes_jobs;
DROP POLICY IF EXISTS "hermes_job_runs read" ON public.hermes_job_runs;
DROP POLICY IF EXISTS "hermes_job_runs write" ON public.hermes_job_runs;
DROP POLICY IF EXISTS "Anyone can manage nurture runs" ON public.nurture_runs;
DROP POLICY IF EXISTS "Anyone can read nurture runs" ON public.nurture_runs;
DROP POLICY IF EXISTS "Allow all operations for single user tool" ON public.roster_sync_runs;
DROP POLICY IF EXISTS "sync_runs read" ON public.sync_runs;
DROP POLICY IF EXISTS "sync_runs write" ON public.sync_runs;
DROP POLICY IF EXISTS "Authenticated can read segment refresh log" ON public.segment_refresh_log;

-- Add admin-only policies on the tables that had no admin policy yet
CREATE POLICY "Admins full access" ON public.hermes_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access" ON public.hermes_job_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access" ON public.nurture_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access" ON public.roster_sync_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access" ON public.sync_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read segment refresh log" ON public.segment_refresh_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable RLS on interest_resources and lock it to admins
ALTER TABLE public.interest_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON public.interest_resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Make sure anon has no table-level privileges on the locked-down tables
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'action_items','activity_feed','ai_personality_settings','blog_posts','brief_logs',
    'calendar_entries','calendar_templates','campaign_analytics','campaign_posts',
    'classroom_resources','community_pulse_runs','content_campaigns','content_ideas',
    'course_modules','dm_templates','draft_replies','email_campaigns','interest_mappings',
    'member_tags','morning_posts','outreach_rules','post_ideas','quick_responses',
    'recipes','scheduled_posts','segment_snapshots','url_health_checks','weekly_goals',
    'weekly_reports','youtube_videos','hermes_jobs','hermes_job_runs','nurture_runs',
    'roster_sync_runs','sync_runs','segment_refresh_log','interest_resources'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;