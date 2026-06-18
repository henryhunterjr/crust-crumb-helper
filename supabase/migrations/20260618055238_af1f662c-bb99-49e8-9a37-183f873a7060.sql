-- Reinstall pg_net into a dedicated extensions schema (pg_net doesn't support ALTER ... SET SCHEMA).
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger-only function: nobody calls this directly.
REVOKE EXECUTE ON FUNCTION public.auto_grant_admin_to_henry() FROM PUBLIC, anon, authenticated;

-- Updated-at helper used only by triggers.
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Role checker is called from RLS by signed-in users; anon never needs it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Quick-response hit counter is called from the app; keep callable but pin explicitly.
REVOKE EXECUTE ON FUNCTION public.increment_qr_search_hits(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_qr_search_hits(uuid[]) TO anon, authenticated, service_role;