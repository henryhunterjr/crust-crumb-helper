-- Auto-grant admin trigger: any new auth.users row for Henry's email becomes an admin
CREATE OR REPLACE FUNCTION public.auto_grant_admin_to_henry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'henryhunterjr@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_grant_admin_to_henry ON auth.users;
CREATE TRIGGER tr_auto_grant_admin_to_henry
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_to_henry();

-- One-shot backfill in case Henry has already signed in
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'henryhunterjr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;