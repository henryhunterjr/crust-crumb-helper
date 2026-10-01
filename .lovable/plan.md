# Roster pipeline: where it actually breaks

## What the live database shows (checked just now)
- **Members table:** 1,504 rows, not 2,945. 1,133 have a community tag; 20 are tagged From Oven to Market.
- **Segments:** 1,133 members have segments filled in. The classifier has completed 92 times, most recently 2026-09-30 03:15 UTC, every night at 03:15.
- **Roster posts:** 685 runs are tagged `crust-crumb-academy`. The **last one landed 2026-09-08**. Nothing has arrived in the last 20+ days.

## Answer: neither A nor B
- The repo already has the Phase 1 code: `read-roster.mjs` sends `community` in the payload, and `ingest-roster` appends it to `members.communities`. The 685 tagged runs show the deployed function has been writing communities.
- The file on your machine (the June 15 version, with no community field) is stale. The repo is fine.
- The real break: **your 6 AM local runs stopped reaching this backend after Sep 8.** That's your option (a). The classifier (option c) is healthy.
- The screen you described (2,945 members, last run 6/30, all zeros, "No runs logged yet") doesn't match this backend. Most likely that's a different or old deployment, or a cached page. The live app is crust-crumb-helper.lovable.app.

## Plan
1. You paste the last ~30 lines of `roster-run.log`. I can't read files on your PC. I'm looking for: `ingest-roster returned 401/403` (key mismatch since the key rotation), `Could not connect to Chrome`, `No member cards` (Skool sign-in expired), or a wrong `INGEST_ROSTER_URL`.
2. Replace your local `read-roster.mjs`, `run-both.ps1/.bat` and `.env.example` with the repo versions. Set `COMMUNITY_SLUG` in each `.env` (CCA: `crust-crumb-academy`, FOTM: `from-oven-to-market`) and use the current `INGEST_API_KEY`.
3. Small hardening, in the repo:
   - `read-roster.mjs`: also stamp `community` on every member object, and write a clear `POST OK/FAILED <status>` line to the log.
   - `ingest-roster`: accept a per-member `community` as well as the payload-level one, falling back to the payload value.
   - `/admin/segments`: show "last roster post received" so a silent stall like this one shows up on screen.
4. Run one dry run, then one real run. Confirm a new roster run row lands today, then publish.

## Technical notes
- No schema changes. The communities merge stays append-only with dedupe.
