# Roster pipeline — verify the fix end to end

The roster agent and ingest function are already fixed and deployed. What remains is confirming your local scraper is posting successfully with community tags.

## Steps

1. **Update your local roster agent** — copy the current `roster-agent/read-roster.mjs` (and `run-both.ps1` / `run-both.bat` / `.env.example`) over your local folder. Your June 15 copy has no community field.
2. **Set the env files** — in the CCA `.env` set `COMMUNITY_SLUG=crust-crumb-academy`; in `.env.fotm` set `COMMUNITY_SLUG=from-oven-to-market`. Confirm `INGEST_API_KEY` matches the current backend secret.
3. **Run one scrape manually** — `node read-roster.mjs` and watch for the log line `POST -> ... community=... members=N` followed by `POST OK` (a 401/403 means a key mismatch).
4. **Paste the last ~30 lines of `roster-run.log` here** — I cannot read files on your PC; this is the evidence that the POST is landing.
5. **I verify the backend** — confirm the new `roster_sync_runs` row landed with status `completed` (or `partial` with real error messages), and that `members.communities` counts updated.
6. **Segments** — the external classifier runs nightly at 03:15 UTC; after the next run, `fotm_all` and `cca_all` should populate.

## Out of scope

- Morning Brief stays external — nothing built here.
- The 36 open security findings are a separate decision (fix vs. intentionally ignore).
