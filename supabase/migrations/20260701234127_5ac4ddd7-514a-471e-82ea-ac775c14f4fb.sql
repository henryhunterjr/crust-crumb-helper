GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT ALL ON public.outreach_messages TO service_role;