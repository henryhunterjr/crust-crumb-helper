-- Atomic increment for quick_responses.search_hit_count.
-- Replaces a read-modify-write loop in the smart-search edge function
-- that would lose updates under concurrent calls.

CREATE OR REPLACE FUNCTION public.increment_qr_search_hits(_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.quick_responses
  SET search_hit_count = COALESCE(search_hit_count, 0) + 1
  WHERE id = ANY(_ids);
$$;

GRANT EXECUTE ON FUNCTION public.increment_qr_search_hits(uuid[]) TO authenticated, service_role;
