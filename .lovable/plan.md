# Sync the local roster agent to the community-aware version

## Finding
The local `roster-agent/read-roster.mjs` (dated 2026-06-15) predates the community attribution feature. The workspace copy already includes it: `COMMUNITY_SLUG` config, slug inference from `SKOOL_MEMBERS_URL`, and `community` in the ingest payload.

## Plan
1. Confirm the workspace `read-roster.mjs` (376 lines) is the version to ship locally — it posts `{ runId, capturedAt, fullRoster, community, members }`.
2. Provide the updated `read-roster.mjs` for you to copy into your local `roster-agent/` folder (replacing the 2026-06-15 file).
3. Update `roster-agent/.env.example` to document `COMMUNITY_SLUG` with values for both communities:
   - CCA: `COMMUNITY_SLUG=crust-crumb-academy` (or rely on URL inference)
   - FOTM: `COMMUNITY_SLUG=from-oven-to-market`
4. Update `roster-agent/README.md` so both the CCA and FOTM `.env` setups show the community field.
5. Publish the app so the updated files are live.

## Technical notes
- No code changes to the ingest endpoint needed — `ingest-roster` already accepts and applies `community`.
- The only change is getting the newer script and env docs onto your machine; the run-both scripts then tag each run correctly.
