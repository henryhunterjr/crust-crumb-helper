## Build sequence

Per your answers, I'm building the **Hermes Job Dashboard first** as the foundation, then plugging the other 3 features in as job types. WordPress.com connector is already linked.

---

## Phase 1 — Hermes Job Dashboard (this pass)

**New route:** `/hermes`

**What it does:**
- Lists all job types (welcome post, re-engagement DMs, newsletter, weekly analytics).
- Each job shows: schedule, next run, last run status, last result.
- Per-job buttons: **Run Now**, **Preview**, **Pause/Resume**, **View Log**.
- Preview opens a dialog showing exactly what would be drafted/sent without committing.
- Log tab shows every run with timestamp, items processed, items succeeded, items failed, error messages.

**Backend:**
- New `hermes_jobs` table: id, job_type, schedule_cron, enabled, last_run_at, next_run_at, config (jsonb).
- New `hermes_job_runs` table: id, job_id, started_at, finished_at, status (running/success/partial/failed), summary (jsonb), error.
- New edge function `hermes-run` — accepts `{job_id, dry_run}`, dispatches to the right handler, writes a run row.
- pg_cron job calls `hermes-run` every 15 min, picks up any job whose `next_run_at <= now()` and `enabled = true`.

**Job handlers wired in Phase 1 (drafts only, nothing auto-sends):**
- `weekly_welcome_post` — Monday 8am. Drafts post for joiners ≤7 days, stores in `outreach_messages` with type=welcome_post for review.
- `daily_reengagement_dms` — Mon–Fri 7am. Picks 5 inactive members, generates resource-recommendation drafts via existing `auto-welcome` function logic, lands in `/outreach-queue`. Caps at 10 new threads/week.
- `weekly_analytics_brief` — Friday 4pm. Generates the 5-bullet report via Lovable AI, writes to `activity_feed`.
- `weekly_newsletter_draft` — Thursday 9am. Stub for Phase 3 (logs "pending").

**Hard rule:** Phase 1 never auto-sends anything to Skool. Everything lands as a draft for Henry to send via the existing flows. You can flip individual jobs to "auto-send" in Phase 4 once we trust them.

---

## Phase 2 — On-Demand Analytics Report

**New section on `/analytics`:** "Decision Brief" button.

- Click → calls `generate-decision-brief` edge function.
- Output: exactly 5 bullets in your voice (1 win / 1 number that moved / 1 member to re-engage by name / 1 content idea / 1 thing to stop).
- Each bullet has a chip link to the underlying metric (member detail, post analytics, weekly report, etc.).
- Saved to `weekly_reports` so the Hermes weekly job reuses the same generator.

---

## Phase 3 — WordPress Newsletter Importer

**New section on `/email-campaigns`:** "Import from Blog".

- Lists 10 most recent posts from `bakinggreatbread.com` via WordPress.com gateway (`/rest/v1.1/sites/{site}/posts`).
- Click a post → edge function `import-wp-post` fetches full HTML, runs cleanup (strip WP shortcodes, inline critical CSS, rewrite relative URLs to absolute https), drops it in a draft editor.
- "Copy HTML + Open Pantry" button matches existing flow: window.open the Pantry composer first, then writeText.
- Draft saved to a new `newsletter_drafts` table so the Hermes Thursday job can pre-build one.

---

## Phase 4 — Editable DM/Post Template System

**Extend `/settings` Quick Response Library section:**

- Add `template_role` field to `quick_responses`: `welcome` | `reengagement` | `manual`.
- Templates marked `welcome` or `reengagement` show in a new "Hermes Templates" picker on the Hermes job config dialog.
- Schedule editor on each job lets you pick which template Hermes uses.
- Variable substitution: `{{member_name}}`, `{{join_date}}`, `{{matched_resource}}`.

---

## What I'll ship in this pass

Phase 1 only. That's:
- 2 new tables + grants + RLS + GRANTs
- 1 new edge function (`hermes-run`)
- 1 pg_cron schedule
- 1 new page (`/hermes`) with job cards, preview dialog, run log
- Nav link added
- 4 job handlers (3 working, 1 stub for newsletter)

Phases 2-4 land in follow-up messages so you can review each before the next stacks on.

## Technical notes

- Existing `auto-welcome` edge function already drafts inactive-member DMs; Hermes calls it with a member-cap and dry-run flag instead of reimplementing.
- Decision brief reuses `generate-weekly-report` prompt scaffolding.
- WordPress.com gateway requires `LOVABLE_API_KEY` + `WORDPRESS_COM_API_KEY` (both present).
- All jobs respect the 10-new-threads/week ceiling via a count query against `outreach_messages` from the current ISO week.
- No nav items get changed without asking; "Hermes" added as a new item at end of the list.

Approve and I'll build Phase 1.