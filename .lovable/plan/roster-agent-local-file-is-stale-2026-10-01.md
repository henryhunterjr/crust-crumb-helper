# Roster Agent: Local File Is Stale

## What I verified

The `read-roster.mjs` in this project reads `COMMUNITY_SLUG` at line 56, infers the community from `SKOOL_MEMBERS_URL` when the variable is missing, and stamps `community` on every member and on the upload payload. The copy inside the `roster-agent-latest.zip` download is byte-for-byte identical to the project file (same checksum).

The file you're looking at on your PC (dated 2026-06-15) is the old version. It was never replaced. Every symptom you've reported — no `COMMUNITY_SLUG` in cfg, missing run-both scripts, segments at zero — traces back to this one thing: the new files have not landed in your local `roster-agent/` folder.

## The fix (your side, about 2 minutes)

1. Download `roster-agent-latest.zip` from Files (delivered in my last message).
2. Extract it **into** your local `roster-agent/` folder. When Windows asks, choose **"Replace the files in the destination"**. This is the step that matters — if you extract to a new folder or skip the replace prompt, the old June 15 file stays in place.
3. Confirm the replace worked: open `read-roster.mjs` and search for `COMMUNITY_SLUG`. You should find it around line 56. Or check the file's modified date — it should read today, not June 15.
4. Confirm `run-both.bat` and `run-both.ps1` now appear in the folder.
5. Edit `.env` (CCA) to include `COMMUNITY_SLUG=crust-crumb-academy` and `.env.fotm` to include `COMMUNITY_SLUG=from-oven-to-market`. Both need the current `INGEST_API_KEY`.
6. Double-click `run-both.bat`, then paste the last ~30 lines of `roster-run.log` here.

## My side after your run

1. Verify the run landed in the backend and community counts updated.
2. Confirm segments populate at the next nightly refresh.
3. Publish the app.

## Out of scope

- Morning Brief stays external.
- The 36 open security findings remain a separate decision.
