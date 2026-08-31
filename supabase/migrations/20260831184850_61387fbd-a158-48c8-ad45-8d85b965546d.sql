-- Replace role-ambiguous policies with explicit authenticated-admin policies
DROP POLICY IF EXISTS "Admins full access" ON public.member_sources;
DROP POLICY IF EXISTS "Admins full access" ON public.member_compass_profiles;

ALTER TABLE public.member_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_compass_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage member sources"
  ON public.member_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage compass profiles"
  ON public.member_compass_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Table-level grants were missing entirely; without these PostgREST 403s.
REVOKE ALL ON public.member_sources FROM anon;
REVOKE ALL ON public.member_compass_profiles FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_compass_profiles TO authenticated;
GRANT ALL ON public.member_sources TO service_role;
GRANT ALL ON public.member_compass_profiles TO service_role;