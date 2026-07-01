
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS fotm_tier text,
  ADD COLUMN IF NOT EXISTS fotm_joined_at date;

ALTER TABLE public.roster_sync_runs
  ADD COLUMN IF NOT EXISTS community text;

CREATE TABLE IF NOT EXISTS public.segment_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  members_updated integer NOT NULL DEFAULT 0,
  pro_members_updated integer NOT NULL DEFAULT 0,
  source text
);
GRANT SELECT ON public.segment_refresh_log TO authenticated;
GRANT ALL ON public.segment_refresh_log TO service_role;
ALTER TABLE public.segment_refresh_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read segment refresh log"
  ON public.segment_refresh_log FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_segment_refresh_log_ran_at
  ON public.segment_refresh_log (ran_at DESC);

CREATE OR REPLACE FUNCTION public.refresh_member_segments()
 RETURNS TABLE(members_updated integer, pro_members_updated integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
               AND (
                 m.fotm_tier = 'founding'
                 OR 'founding' = ANY(m.wingman_tags)
                 OR (m.fotm_joined_at IS NOT NULL AND m.fotm_joined_at < DATE '2026-07-06')
               ) THEN 'fotm_founding' END,
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

  INSERT INTO public.segment_refresh_log (members_updated, pro_members_updated, source)
  VALUES (m_count, p_count, 'refresh_member_segments');

  RETURN QUERY SELECT m_count, p_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.refresh_member_segments() TO authenticated, service_role;
