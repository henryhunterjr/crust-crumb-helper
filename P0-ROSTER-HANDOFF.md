# P0 — Automatic member read (handoff)

Replaces the manual CSV with a scheduled roster read. Two halves:

- **Catcher (backend):** a new `ingest-roster` edge function that upserts a
  roster read into `members` the same way the CSV importer does, plus
  non-destructive reconciliation.
- **Reader (local):** a browser agent in `roster-agent/` that reads the Skool
  directory from your logged-in Chrome and posts it to that function, daily.

## What changed in this repo

| File | What it is |
| --- | --- |
| `supabase/functions/_shared/roster-logic.ts` | Pure matching + engagement logic. Single source of truth, mirrors `useMembers.ts` + `segmentation.ts`. |
| `supabase/functions/ingest-roster/index.ts` | New edge function. Bearer `INGEST_API_KEY` auth (same as `ingest-brief`). Inserts new members, partial-updates existing ones, flags missing ones, logs each run. |
| `supabase/migrations/20260613120000_roster_sync.sql` | Adds `members.roster_status`, `members.roster_last_seen_at` (and `skool_username`/`message_status` if missing), and a `roster_sync_runs` log table. |
| `supabase/config.toml` | Registers `ingest-roster` with `verify_jwt = false` (matches the others). |
| `src/test/roster-logic.test.ts` | 26 tests proving the logic equals the CSV importer. `node ./node_modules/vitest/vitest.mjs run src/test/roster-logic.test.ts`. |
| `roster-agent/` | The local reader: `read-roster.mjs`, `selectors.json`, README, env example. |

## Design choices worth knowing

- **Updates are partial.** The reader may not see every field (Skool hides
  application answers and counts in places). On update we only write what we
  actually read, so a sync never wipes an `application_answer` or zeroes a
  post count we could not see. Inserts mirror the CSV importer exactly.
- **Outreach state is never touched.** Re-syncing cannot undo welcome progress.
- **Matching prefers `skool_username`, falls back to name.** Keeps faith with
  the CSV name match while preventing duplicate rows when a display name changes.
- **Nothing is deleted.** Members no longer on the roster are flagged
  `missing_from_roster`. You decide what to do with them.
- **Empty reads are rejected** on both ends. A zero-member read is treated as
  a broken read, never as an empty community.

## To publish (via Lovable)

1. Bring this branch into Lovable and **publish** so the `ingest-roster`
   function and the `20260613120000_roster_sync` migration deploy to Supabase
   project `anponqqhjugwflakydsf`.
2. Confirm `INGEST_API_KEY` is set in the function secrets (it already is, for
   `ingest-brief`).

## First live run (do this together)

1. `cd roster-agent && npm install && npx playwright install chromium`
2. Start Chrome with `--remote-debugging-port=9222` on your normal profile
   (signed into Skool). See `roster-agent/README.md`.
3. `node --env-file=.env read-roster.mjs --probe` and confirm/fix
   `selectors.json` against the sample HTML.
4. `--dry-run` to eyeball the payload, then a real run.
5. Check the Helper's Members page: fresh members in, engagement matching the
   CSV path, reconciliation flags correct. Then schedule it daily.
