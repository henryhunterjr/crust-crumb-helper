# Roster Agent: Local Files Are Stale (Final Confirmation)

## What I verified (again, just now)

The deployed `ingest-roster` function writes community tags: line 141 stamps `communities` on new rows, and lines 201-203 merge the community into existing members' `communities` arrays. The `read-roster.mjs` in this project reads `COMMUNITY_SLUG` at line 56 and stamps it on every member and the payload. The copy in `roster-agent-latest.zip` is byte-for-byte identical (same checksum).

Every file you've pasted — cfg, post(), payload type, insert path — is from your local June 15 copies. None of them match what runs today. There is nothing left to fix in the project or the backend. The only remaining step is replacing the files on your PC.

## The fix (your side, about 2 minutes)

1. Download `roster-agent-latest.zip` from Files.
2. Extract it **into** your local `roster-agent/` folder. When Windows asks, choose **"Replace the files in the destination"**. If you extract anywhere else, the old June 15 files stay in place and nothing changes.
3. Confirm it worked: open `read-roster.mjs`, search for `COMMUNITY_SLUG` — it should appear around line 56, and the file's modified date should be today, not June 15.
4. Edit `.env` (CCA) to include `COMMUNITY_SLUG=crust-crumb-academy` and `.env.fotm` to include `COMMUNITY_SLUG=from-oven-to-market`. Both need the current `INGEST_API_KEY`.
5. Double-click `run-both.bat`, then paste the last ~30 lines of `roster-run.log` here.

## My side after your run

1. Verify the run landed and community counts updated.
2. Confirm segments populate at the next nightly refresh.

## Out of scope

- The 38 security findings you selected are already fixed and published.
- Morning Brief stays external.
