# Fix: stale local roster agent (June 15 version)

## Diagnosis (verified)

The workspace `roster-agent/read-roster.mjs` already does everything Phase 1 promised:

- Reads `COMMUNITY_SLUG` from env, falls back to inferring it from `SKOOL_MEMBERS_URL`, and refuses to run if neither is set (lines 49-60).
- Stamps `community` on every normalized member (line 234) and on the POST payload (line 319).
- The deployed `ingest-roster` function accepts payload-level community with a per-member fallback and appends it to `members.communities`.

The file you pasted (dated 2026-06-15, no community anywhere) is your **local copy** on your Windows machine. It is stale. The 6 AM scheduled task runs that old file, which is why rosters post but `communities` never gets written and all 11 segments read 0.

This is path A, but only locally: the repo and the deployed backend are correct; your machine is running an old copy.

## Plan

1. **Export the current workspace files for download** so you can overwrite your local folder:
   - `roster-agent/read-roster.mjs` (community-aware version)
   - `roster-agent/.env.example` (documents `COMMUNITY_SLUG`)
   - `roster-agent/run-both.ps1` and `run-both.bat` (run CCA + FOTM scrapes back to back)
2. **You replace your local files** with these, then set `COMMUNITY_SLUG` in each `.env`:
   - CCA `.env`: `COMMUNITY_SLUG=crust-and-crumb-academy`
   - FOTM `.env`: `COMMUNITY_SLUG=from-oven-to-market`
3. **Run one scrape manually** (`node read-roster.mjs`) and confirm the log line shows `community=...` on the POST.
4. **Verify in the backend**: query `members` for non-empty `communities`, then trigger the segment classifier and confirm `fotm_all` / `cca_all` counts populate on `/admin/segments`.

## Technical details

- No code changes needed in the repo or the deployed function — both already handle community.
- The only change is getting the current files onto your machine and setting `COMMUNITY_SLUG` locally.
- If a scrape posts with no community, the ingest function rejects it loudly rather than writing nothing, so a misconfigured `.env` fails visibly in `roster-run.log`.
