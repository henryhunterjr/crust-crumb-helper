-- =============================================================================
-- Security hardening: replace open "Allow all" RLS with admin-only access.
-- Introduces user_roles + has_role() so the app is gated by Supabase auth.
-- =============================================================================

-- 1. Role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin');
  END IF;
END$$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. has_role() — SECURITY DEFINER so policies can call it without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4. Lock down user_roles itself
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own roles"   ON public.user_roles;
DROP POLICY IF EXISTS "admins manage all roles" ON public.user_roles;

CREATE POLICY "users see own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Replace "Allow all" policies on every app table with admin-only access.
-- Also drops the pair of open SELECT/ALL policies created for the brief
-- ingestion tables (see migration 20260316002741).
DO $$
DECLARE
  t        text;
  tables   text[] := ARRAY[
    -- core app tables
    'activity_feed',
    'ai_personality_settings',
    'calendar_templates',
    'campaign_analytics',
    'campaign_posts',
    'classroom_resources',
    'content_campaigns',
    'course_modules',
    'dm_templates',
    'email_campaigns',
    'email_drafts',
    'email_subscribers',
    'interest_mappings',
    'member_tags',
    'members',
    'outreach_messages',
    'outreach_rules',
    'post_ideas',
    'quick_responses',
    'recipes',
    'scheduled_posts',
    'segment_snapshots',
    'url_health_checks',
    'weekly_goals',
    'weekly_reports',
    -- brief ingestion tables (added 20260316002741)
    'brief_logs',
    'action_items',
    'draft_replies',
    'calendar_entries',
    'content_ideas',
    'community_pulse_runs',
    'morning_posts'
  ];
  open_policies text[] := ARRAY[
    'Allow all for single user tool',
    'Allow all operations for single user tool',
    'Allow all reads on brief_logs',
    'Allow all writes on brief_logs',
    'Allow all reads on action_items',
    'Allow all writes on action_items',
    'Allow all reads on draft_replies',
    'Allow all writes on draft_replies',
    'Allow all reads on calendar_entries',
    'Allow all writes on calendar_entries',
    'Allow all reads on content_ideas',
    'Allow all writes on content_ideas',
    'Allow all reads on community_pulse_runs',
    'Allow all writes on community_pulse_runs',
    'Allow all reads on morning_posts',
    'Allow all writes on morning_posts'
  ];
  p text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOREACH p IN ARRAY open_policies LOOP
        EXECUTE format('DROP POLICY IF EXISTS %L ON public.%I', p, t);
      END LOOP;
      EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "Admins full access" ON public.%I ' ||
        'FOR ALL USING (public.has_role(auth.uid(), ''admin'')) ' ||
        'WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        t
      );
    END IF;
  END LOOP;
END$$;

-- 6. Seed admin access for Henry's account (case-insensitive match on email).
-- This runs only if an auth.users row already exists (i.e. after first
-- Google sign-in). If no row exists yet, re-run this statement manually
-- once the user has signed in.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('henryhunterjr@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- -----------------------------------------------------------------------------
-- To grant admin to additional users after they've signed in once, run:
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'terry@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
-- -----------------------------------------------------------------------------
