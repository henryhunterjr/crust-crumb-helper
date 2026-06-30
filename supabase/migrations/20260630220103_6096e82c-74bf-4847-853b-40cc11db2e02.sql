DROP POLICY IF EXISTS "DEV public full access" ON public.members;
DROP POLICY IF EXISTS "DEV public full access" ON public.outreach_messages;
DROP POLICY IF EXISTS "DEV public full access" ON public.email_subscribers;
DROP POLICY IF EXISTS "DEV public full access" ON public.email_drafts;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.members FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.email_subscribers FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.email_drafts FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drafts TO authenticated;