# Go-Live Runbook — Security Hardening

This runbook takes the app from "functionally green, security red" to "launch-ready."
Do steps 1–3 in order. Steps 2 and 3 only take a minute each but must happen in sequence.

## Step 1 — Apply the two migrations to the production Supabase

**Order matters.** Apply `20260417_security_hardening_user_roles.sql` first, then
`20260417_increment_qr_search_hits.sql`.

### Option A: Supabase Dashboard (fastest, no CLI needed)

1. Open https://supabase.com/dashboard/project/anponqqhjugwflakydsf/sql/new
2. Open [`supabase/migrations/20260417_security_hardening_user_roles.sql`](supabase/migrations/20260417_security_hardening_user_roles.sql) in this repo and paste the full contents into the SQL editor
3. Click **Run**. Expected output: `Success. No rows returned.`
4. In the same editor, replace with [`supabase/migrations/20260417_increment_qr_search_hits.sql`](supabase/migrations/20260417_increment_qr_search_hits.sql) and click **Run** again

### Option B: Supabase CLI

```sh
supabase link --project-ref anponqqhjugwflakydsf
supabase db push
```

### Option C: Lovable

Open the Lovable chat for this project and say: "apply the two migrations in
`supabase/migrations/` dated 20260417." Lovable will handle the sync.

## Step 2 — Grant yourself admin

The migration in Step 1 auto-seeds `henryhunterjr@gmail.com` as admin **if** that
account has already signed in once (i.e. has a row in `auth.users`). If you have
never signed in to the helper app before, or if your auth.users row uses a
different email casing, grant yourself admin manually:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'henryhunterjr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

Verify:

```sql
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id;
```

Expected: one row, your email + `admin`.

## Step 3 — Smoke test the preview deployment

1. Open the preview URL:
   https://crust-crumb-helper-git-security-857933-henryhunterjrs-projects.vercel.app
2. You should land on `/login`
3. Sign in with Google (`henryhunterjr@gmail.com`)
4. You should land on the dashboard with your data populated

If the dashboard loads and members appear: **green light, merge the PR.**

## Step 4 — Merge and deploy

```sh
gh pr merge 1 --squash
```

Vercel auto-deploys from `main`. Watch the deployment at
https://vercel.com/henryhunterjrs-projects/crust-crumb-helper — should be READY
in under a minute. Visit https://crust-crumb-helper.vercel.app — sign in — done.

## Rollback (if anything goes wrong)

### Frontend

```sh
gh pr revert 1 && git push origin main
```

or redeploy an earlier production deployment from the Vercel dashboard
(`dpl_Bnbb5FX7Cor4swH3fno1mRyDE6Yx` was the last known-good production deploy).

### Database

The RLS migration is reversible but not trivial. To restore "Allow all" policies:

```sql
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_feed','ai_personality_settings','calendar_templates','campaign_analytics',
    'campaign_posts','classroom_resources','content_campaigns','course_modules','dm_templates',
    'email_campaigns','email_drafts','email_subscribers','interest_mappings','member_tags',
    'members','outreach_messages','outreach_rules','post_ideas','quick_responses','recipes',
    'scheduled_posts','segment_snapshots','url_health_checks','weekly_goals','weekly_reports',
    'brief_logs','action_items','draft_replies','calendar_entries','content_ideas',
    'community_pulse_runs','morning_posts'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Allow all for single user tool" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END$$;
```

`increment_qr_search_hits` is additive and safe to leave in place on rollback.

## What changed on the database

- New table: `public.user_roles`
- New enum: `public.app_role` (values: `admin`)
- New functions: `public.has_role(uuid, app_role)`, `public.increment_qr_search_hits(uuid[])`
- All 32 app tables (24 original + 7 brief + `user_roles` itself) now enforce admin-only RLS

## What changed on the frontend

- `/login` is now the public entry; every other route is admin-only (`<ProtectedRoute>`)
- Non-admin Google accounts are signed out immediately with a toast
- All 10 user-facing edge functions require a valid Supabase JWT (`verify_jwt = true`)
- `ingest-brief` and `get-brief` remain open but require a bearer token matching `INGEST_API_KEY`
- Edge functions respond with origin-reflected CORS instead of wildcard `*`
- `smart-search` hit-count uses an atomic RPC (fixes a race condition)
- `.env` ignored by git; `.env.example` added
- GitHub Actions CI runs typecheck + lint + test + build on every push/PR
