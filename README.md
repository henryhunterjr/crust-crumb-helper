# Crust & Crumb Helper

Community management console for Crust & Crumb Academy. Member tracking, AI DM
generation, outreach queue, smart search, analytics, templates, campaigns, and
logging.

## Stack

- Vite + React 18 + TypeScript
- Supabase (Postgres, Auth, Edge Functions)
- Tailwind CSS + shadcn-ui
- Deployed on Vercel (`crust-crumb-helper.vercel.app`)
- Scaffolded and iterated via Lovable

## Local development

```sh
npm install
cp .env.example .env     # fill in Supabase values
npm run dev              # http://localhost:8080
```

## Environment variables

Required in every environment (local `.env`, Vercel preview, Vercel production):

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (safe to expose; RLS enforces access) |

Required as Supabase **function secrets** (set via Supabase dashboard or `supabase secrets set`):

| Var | Used by |
|---|---|
| `LOVABLE_API_KEY` | `generate-dm`, `generate-post`, `generate-email`, `generate-campaign`, `generate-weekly-report`, `smart-search` |
| `FIRECRAWL_API_KEY` | `sync-classroom` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase into every function.

## Access control

The app is admin-only. Access is gated by four layers:

1. **Google sign-in** via `@lovable.dev/cloud-auth-js` (issues a Supabase session).
2. **`user_roles` table** — only users with `role = 'admin'` pass `ProtectedRoute`.
3. **RLS policies** — every table grants access only to admins via `has_role(auth.uid(), 'admin')`.
4. **`verify_jwt = true`** on every edge function.

To grant admin access to a new user, have them sign in once, then run:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'person@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest run |
| `npm run preview` | Preview the built bundle |

## Deployment

- **Frontend**: Pushes to `main` auto-deploy to Vercel.
- **Database migrations**: Apply via Lovable, `supabase db push`, or the Supabase dashboard SQL editor.
- **Edge functions**: Deploy via Lovable or `supabase functions deploy <name>`.

CI runs typecheck, lint, tests, and build on every PR and push to `main`
([.github/workflows/ci.yml](.github/workflows/ci.yml)).
