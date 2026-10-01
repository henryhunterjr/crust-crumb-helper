# Roster Agent: Missing Scripts + Segment Population

## Answers to your four questions

**1. run-both.bat / run-both.ps1 are missing locally.**
They exist in the project and were inside the `roster-agent-latest.zip` delivered earlier (verified: the zip contains all 8 files). Your local folder was never updated with the zip contents. Fix: re-download the zip and extract it over your local `roster-agent/` folder, choosing "replace" when prompted. After that, `run-both.bat` will be there to double-click.

**2. Manual commands in the meantime** (run from inside the `roster-agent` folder):

```text
CCA:  powershell -NoProfile -ExecutionPolicy Bypass -File run-roster.ps1 -EnvFile ".env"
FOTM: powershell -NoProfile -ExecutionPolicy Bypass -File run-roster.ps1 -EnvFile ".env.fotm"
```

**3. Which env file for FOTM:** `.env.fotm`. The plain `.env` (dated 6/15) is your CCA config. Each env file needs its own `SKOOL_MEMBERS_URL`, `COMMUNITY_SLUG`, and the current `INGEST_API_KEY`:
- `.env` → `COMMUNITY_SLUG=crust-crumb-academy`
- `.env.fotm` → `COMMUNITY_SLUG=from-oven-to-market`

**4. Segments all reading 0:** No separate step is needed from you. Segments populate automatically from member data, but only after a successful roster sync lands. Your local log shows the scraper runs at 6 AM, but the backend has received no real run since Sep 8 — so there is nothing for the segments to count. Once one manual sync posts successfully (watch for `POST OK` in the log), community tags update immediately and segments fill in at the next nightly refresh.

## Work items (my side)

1. Re-deliver `roster-agent-latest.zip` to Files so you can download it fresh.
2. After you run one manual sync, verify in the backend that the run row landed, community counts updated, and note the next segment refresh time.
3. Publish the app.

## Your side

1. Download and extract the zip over your local `roster-agent/` folder.
2. Confirm `.env` and `.env.fotm` each have the right `COMMUNITY_SLUG` and current `INGEST_API_KEY`.
3. Run the two manual commands above (or double-click `run-both.bat`).
4. Paste the last ~30 lines of `roster-run.log` here so I can confirm the upload landed.

## Out of scope

- Morning Brief stays external.
- The open security findings remain a separate decision.
