
-- Phase 1: Community Outreach Hub

-- 1. Extend members with segmentation columns
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS communities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wingman_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS segments text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS segments_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS members_segments_gin ON public.members USING gin (segments);
CREATE INDEX IF NOT EXISTS members_communities_gin ON public.members USING gin (communities);
CREATE INDEX IF NOT EXISTS members_wingman_tags_gin ON public.members USING gin (wingman_tags);

-- 2. pro_members (course entitlement source of truth)
CREATE TABLE IF NOT EXISTS public.pro_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  rpp_purchase_source text,
  segments text[] NOT NULL DEFAULT '{}',
  segments_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pro_members TO authenticated;
GRANT ALL ON public.pro_members TO service_role;

ALTER TABLE public.pro_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pro_members"
  ON public.pro_members FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pro_members_updated_at
  BEFORE UPDATE ON public.pro_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS pro_members_email_lower ON public.pro_members (lower(email));
CREATE INDEX IF NOT EXISTS pro_members_segments_gin ON public.pro_members USING gin (segments);

-- 3. outreach_templates
CREATE TABLE IF NOT EXISTS public.outreach_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  channel text NOT NULL DEFAULT 'both' CHECK (channel IN ('email','skool_dm','both')),
  segment_key text,
  subject text,
  body text NOT NULL,
  merge_tags text[] NOT NULL DEFAULT '{}',
  daily_cap integer NOT NULL DEFAULT 500,
  dedupe_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_templates TO authenticated;
GRANT ALL ON public.outreach_templates TO service_role;

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach_templates"
  ON public.outreach_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER outreach_templates_updated_at
  BEFORE UPDATE ON public.outreach_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Segment classification function (idempotent, recomputes all rows)
CREATE OR REPLACE FUNCTION public.refresh_member_segments()
RETURNS TABLE(members_updated integer, pro_members_updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m_count integer := 0;
  p_count integer := 0;
BEGIN
  WITH upd AS (
    UPDATE public.members m
    SET segments = ARRAY(
      SELECT unnest FROM unnest(ARRAY[
        CASE WHEN m.communities @> ARRAY['crust-crumb-academy'] THEN 'cca_all' END,
        CASE WHEN m.communities @> ARRAY['crust-crumb-academy']
               AND 'super_engaged' = ANY(m.wingman_tags) THEN 'cca_super_engaged' END,
        CASE WHEN m.communities @> ARRAY['crust-crumb-academy']
               AND 'leads' = ANY(m.wingman_tags) THEN 'cca_leads' END,
        CASE WHEN m.communities @> ARRAY['crust-crumb-academy']
               AND EXISTS (
                 SELECT 1 FROM public.pro_members pm
                 WHERE lower(pm.email) = lower(m.email)
                   AND pm.rpp_purchase_source IN ('course_premium','course_vip','founding_197')
               ) THEN 'cca_customers' END,
        CASE WHEN m.communities @> ARRAY['crust-crumb-academy']
               AND NOT (m.communities @> ARRAY['from-oven-to-market']) THEN 'cca_not_yet_fotm' END,
        CASE WHEN m.communities @> ARRAY['from-oven-to-market'] THEN 'fotm_all' END,
        CASE WHEN m.communities @> ARRAY['from-oven-to-market']
               AND 'founding' = ANY(m.wingman_tags) THEN 'fotm_founding' END,
        CASE WHEN m.communities @> ARRAY['from-oven-to-market']
               AND EXISTS (
                 SELECT 1 FROM public.pro_members pm
                 WHERE lower(pm.email) = lower(m.email)
                   AND pm.rpp_purchase_source IN ('course_premium','course_vip')
               ) THEN 'fotm_paid_course' END,
        CASE WHEN 'prospect' = ANY(m.wingman_tags)
               AND NOT (m.communities @> ARRAY['from-oven-to-market']) THEN 'fotm_prospects' END
      ]) unnest WHERE unnest IS NOT NULL
    ),
    segments_updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO m_count FROM upd;

  WITH pupd AS (
    UPDATE public.pro_members pm
    SET segments = ARRAY(
      SELECT unnest FROM unnest(ARRAY[
        CASE WHEN pm.rpp_purchase_source IN ('course_premium','course_vip','founding_197') THEN 'cca_customers' END,
        CASE WHEN pm.rpp_purchase_source IN ('course_premium','course_vip') THEN 'fotm_paid_course' END
      ]) unnest WHERE unnest IS NOT NULL
    ),
    segments_updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO p_count FROM pupd;

  RETURN QUERY SELECT m_count, p_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_member_segments() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.refresh_member_segments() TO authenticated, service_role;

-- 5. Nightly cron (03:15 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('refresh-member-segments-nightly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-member-segments-nightly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh-member-segments-nightly',
  '15 3 * * *',
  $$ SELECT public.refresh_member_segments(); $$
);
