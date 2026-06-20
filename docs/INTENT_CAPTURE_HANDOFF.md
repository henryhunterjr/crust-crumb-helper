# Intent Capture & Oven-to-Market Funnel — Handoff for Claude Code

Audience: Claude Code, working through the backend on the Crust & Crumb
Helper repo. This document is the state-of-affairs Lovable (the frontend
agent) has on the new intake-question work. Lovable will own UI + edge
function wiring; Claude owns the data model, scraper extension, and
external email sync.

---

## 1. The business goal

The Skool intake form now asks new applicants extra questions. We want to:

1. Capture **all** intake answers per member (today only the first is stored
   in `members.application_answer`).
2. Classify each member's intent — especially around **monetizing their
   baking** — so we can build a target list for the paid **From Oven to
   Market** course.
3. Send those targets resources that pull them toward the course, tracked
   so we don't re-touch the same person endlessly.
4. Sync the target segment outward (MailerLite recommended) so email
   nurture happens outside Skool's 10-DM/week ceiling.

## 2. What already exists in this repo

### Data
- `members` table (21 cols). Relevant: `id, skool_name, skool_username,
  email, join_date, application_answer, post_count, comment_count,
  last_active, engagement_status, message_status, outreach_sent,
  outreach_sent_at, outreach_responded, notes, priority_score,
  priority_level, roster_status, roster_last_seen_at, created_at,
  updated_at`.
  - `application_answer` is a single text field. Today the roster agent +
    CSV importer dump the first intake answer here. New questions are not
    captured anywhere.
- `member_tags` (free-form tags per member) — already used by
  `BulkTagDialog`, `MemberTagBadges`, `TagFilterDropdown`. Usable as a
  lightweight tier mechanism but not the right home for canonical intent.
- `outreach_messages` — every DM/email we generate or send, with
  `message_type`, `sent_at`, `responded_at`.
- `email_subscribers`, `email_campaigns`, `email_drafts` — internal
  newsletter system, **not** wired to any ESP yet.
- `roster_sync_runs` — log of ingest-roster runs.

### Ingestion
- `roster-agent/read-roster.mjs` (local Playwright) → POSTs to
  `supabase/functions/ingest-roster/index.ts` → uses
  `supabase/functions/_shared/roster-logic.ts` (the single source of
  truth, mirrored by `src/test/roster-logic.test.ts`).
- `RosterMemberInput` currently has: `name, skoolUsername, email,
  joinDate, applicationAnswer, posts, comments, lastActive, profileUrl`.
  **No multi-question support.**
- Updates are partial — a sync never wipes a field it could not read.
  Outreach state is never touched.

### AI / outreach
- `supabase/functions/hermes-run` — Gemini 3 Flash via Lovable AI Gateway
  (`https://ai.gateway.lovable.dev/v1/chat/completions`,
  `google/gemini-3-flash-preview`). Drives bulk welcome + nurture.
- `supabase/functions/generate-dm` — single-member DM generator. Calls
  `findMatchingResources()` against `application_answer` to pick
  course/recipe/blog links from `classroom_resources`, `recipes`,
  `blog_posts`.
- `supabase/functions/auto-welcome` — first-touch path for new joiners.
- `supabase/functions/_shared/ai-settings.ts` — Krusty voice rules.
- `interest_mappings` table — already maps keywords → resources.
- Chrome extension (`extension/`) + floating Paste & Send buttons handle
  delivery into Skool (plain text only, max 10 new threads / week).

### Email / external delivery
- `email_subscribers`, `email_campaigns`, `cross-reference-emails`,
  `generate-email`. All internal. **No ESP connector exists.** Only
  connectors configured today: Firecrawl, WordPress.com.

## 3. Hard constraints

- **Skool**: plain text only, no markdown, max 10 new DM threads / week.
  No public Skool API — everything goes through the local roster agent
  or the Chrome extension.
- **AI**: Lovable AI Gateway, model `google/gemini-3-flash-preview`,
  endpoint exactly `https://ai.gateway.lovable.dev/v1/chat/completions`.
  Use `LOVABLE_API_KEY` (already set as a function secret).
- **Auth**: this is a single-user tool; RLS is intentionally permissive
  on member-facing tables. Do not add auth gates.
- **Never edit**: `src/integrations/supabase/client.ts`,
  `src/integrations/supabase/types.ts`, `.env`,
  `supabase/config.toml` project-level settings (you may add a new
  `[functions.x]` block for new functions).
- **Public-schema migrations**: every new table needs explicit
  `GRANT ... TO service_role` (and `authenticated` if read from the
  client) in the same migration. Supabase does not grant defaults.

## 4. Proposed data model (for Claude to refine)

Add to `members`:

| column | type | purpose |
|---|---|---|
| `intent_raw` | `jsonb` | Full Q/A map from intake, e.g. `{"q1": "...", "q3": "I want to sell at farmers markets"}`. Append-only, last write wins per key. |
| `intent_tier` | `text` | Canonical bucket: `hobbyist`, `curious_seller`, `aspiring_pro`, `active_seller`. |
| `intent_tier_source` | `text` | `ai`, `manual`, `import`. |
| `intent_tier_updated_at` | `timestamptz` | When the tier was last set. |
| `nurture_status` | `text` | `none`, `queued`, `touched`, `converted`, `opted_out`. |
| `last_business_touch_at` | `timestamptz` | Last time we sent an Oven-to-Market-aligned resource. |
| `business_touch_count` | `int` | Cap re-touch frequency. |
| `source` | `text` | `roster`, `csv`, `manual`, `extension`. |

Keep `application_answer` for backwards compatibility — write the first
question's answer there AND the full map into `intent_raw`.

New view `oven_to_market_targets` selecting members where
`intent_tier in ('curious_seller','aspiring_pro','active_seller')` and
`nurture_status <> 'opted_out'`, ordered by `priority_score desc`.

## 5. Work breakdown

### Part 1 — Capture (Lovable can own)
1. Migration: add the 8 columns above + the view. GRANTs included.
2. Extend `RosterMemberInput` / `buildInsert` / `buildUpdate` in
   `_shared/roster-logic.ts` to accept `intentRaw: Record<string,string>`
   and merge (not overwrite) per-key.
3. Update `ingest-roster` to persist `intent_raw` + `source='roster'`.
4. Update `roster-agent/read-roster.mjs` selectors to read all visible
   intake answers from the member drawer (Skool currently exposes them
   on the profile expand — confirm with `--probe`).
5. Update CSV importer (`useMembers.ts` importMembers) + Add Member
   dialog to accept multiple Q/A pairs.

### Part 2 — Classify (Claude)
1. New edge function `classify-intent` — takes a member id, reads
   `intent_raw`, calls Lovable AI Gateway with a tight prompt that
   returns one of the four tiers + a one-line rationale, writes back
   `intent_tier` (`source='ai'`).
2. Trigger from `ingest-roster` after insert/update when `intent_raw`
   changes. Idempotent.
3. Manual override UI on Member detail dialog (Lovable will build once
   Claude ships the function + columns).

### Part 3 — Target & nurture (split)
1. Lovable: new `/targets` page (or a Members filter tab) listing the
   `oven_to_market_targets` view, with tier badges, last-touch column,
   bulk-DM hook into existing `BulkDMQueueDialog`.
2. Claude: extend `generate-dm` so when `intent_tier in
   ('curious_seller','aspiring_pro','active_seller')` the resource
   picker biases toward Oven-to-Market modules (add an `interest_mapping`
   row keyed on tier, or a hard rule in `findMatchingResources`).
3. Both: on send, bump `business_touch_count`, set
   `last_business_touch_at`, set `nurture_status='touched'`.

### Part 4 — External email (Claude, decision pending)
Recommendation: **MailerLite** over Pantry's newsletter.
- Real segments + automations, REST API with subscriber tags, free up
  to 1000 contacts.
- Pantry's newsletter today has no segment API; can't drive a targeted
  funnel.

If approved: new connector secret `MAILERLITE_API_KEY`, new edge function
`sync-mailerlite` that pushes the `oven_to_market_targets` view into a
MailerLite group tagged by `intent_tier`. Scheduled daily.

## 6. Open questions for the user

1. Confirm the exact intake questions and how many we should treat as
   canonical (so the AI prompt + UI labels are stable).
2. MailerLite vs Pantry newsletter for Part 4.
3. Re-touch cadence cap for `business_touch_count` (suggest: max 1 / 14d,
   hard stop after 4).
4. Should `opted_out` be derivable from a reply keyword ("stop",
   "unsubscribe") or only manual?

## 7. What Lovable will NOT do without sign-off

- Touch `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Add a new ESP connector before Part 4 is approved.
- Change Krusty voice rules in `_shared/ai-settings.ts`.
- Modify the Chrome extension's send path (10/week ceiling stays).

---

Ping Lovable when Part 2 columns + function are live and we'll wire the
UI (Member detail override + `/targets` page) the same session.