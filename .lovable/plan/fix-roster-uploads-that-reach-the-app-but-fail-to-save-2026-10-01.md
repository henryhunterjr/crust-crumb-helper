# Fix roster uploads that reach the app but fail to save

## What the data shows
You picked the right one: (b). The scraper's uploads are landing, but the app rejects them.
- 700 roster uploads logged: only 22 succeeded (last success July 9). 678 failed, most recently Sep 8.
- Every failure's reason was saved as "[object Object]", so the real cause was thrown away. That's why nothing looked wrong.
- When an upload fails, nothing from it is saved: no new members, no community tags, no "last seen" dates.

## Likely cause (unconfirmed until step 1 lands)
Database errors aren't standard error objects, so the upload code flattened them to "[object Object]". The top suspect is the new rule that each email can only appear once (added during the duplicate cleanup). Adding a new member whose email already exists would fail the whole batch. Step 1 confirms or rules this out.

## Steps
1. **Record the real failure reason.** Save the database's actual message, details, and code on every failed upload, and send it back to the scraper so it shows in roster-run.log.
2. **Make one bad row stop failing the whole upload.**
   - Before adding new members, match them against existing members by email as well as Skool username/name, and update them instead of creating duplicates.
   - Save new members in small batches. If a batch fails, retry row by row, skip the bad rows, and list them in the log.
   - Updates already run one at a time. A single failed update gets logged and skipped instead of killing the run.
3. **Status "partial"** when some rows were skipped, so the log separates clean, partial, and failed runs.
4. Deploy, then send a small test upload and confirm a completed run lands and community tags are written.
5. You run the scraper once for real. I confirm the run row, the community counts, and the next nightly segment refresh.

## Technical details
- `supabase/functions/ingest-roster/index.ts`: the catch block reads `err.message ?? err.details ?? JSON.stringify(err)`, plus `code`/`hint`. The insert path pre-matches by `lower(email)` against `existing`, chunks 100 rows, and falls back to per-row on error. Per-update try/catch collects `{id, error}` into `skipped_rows`.
- `roster_sync_runs.status` accepts `partial`. The error column stores the joined messages. No schema change unless status is constrained (checked before deploying).
- `roster-agent/read-roster.mjs` already prints the response body on POST FAILED. No scraper change is needed.
- Publish when done.
