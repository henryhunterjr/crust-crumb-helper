# Roster Agent (P0)

The eyes inside Skool. A small local script that reads your member directory and
posts it to the Helper's `ingest-roster` endpoint, so the app's member data stays
fresh without you exporting a CSV. It runs on a daily schedule on your machine.

It behaves like you working by hand: it rides a real signed-in Chrome session at a
human pace and stops loudly if the page looks wrong. It never stores your password
and never posts an empty read.

## How it works

- A **dedicated Chrome profile** (`%USERPROFILE%\roster-agent-profile`) is signed
  in to Skool once. The agent drives that profile over Chrome's debug port (9223),
  so it never touches your everyday browser.
- It reads the **Active** members tab (your full current roster), walks the
  numbered pages, and posts the result to `ingest-roster`.
- `--full` reconciliation flags anyone in the table who is no longer on the roster
  as `missing_from_roster` (never deleted). `--partial` skips that.

## One-time setup

1. Install the dependency:
   ```
   cd roster-agent
   npm install
   ```
2. Copy `.env.example` to `.env` and put your `INGEST_API_KEY` in it.
3. Create the dedicated profile and sign in to Skool **once** (a visible window):
   ```
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9223 --user-data-dir="$env:USERPROFILE\roster-agent-profile" "https://www.skool.com/crust-crumb-academy-7621/-/members"
   ```
   Log in, confirm you see the member list, then close the window. The session
   persists on disk for every future run. Re-do this only if the session expires
   (usually months out).

## Running it by hand

Start the dedicated Chrome (headless is fine once signed in), then run the agent:
```
node --env-file=.env read-roster.mjs --probe      # confirm selectors, posts nothing
node --env-file=.env read-roster.mjs --dry-run     # full read, prints payload, posts nothing
node --env-file=.env read-roster.mjs --partial     # insert + update, flag nobody missing
node --env-file=.env read-roster.mjs --full        # insert + update + flag departed
```
Or just use the runner, which launches and shuts down its own Chrome:
```
powershell -ExecutionPolicy Bypass -File run-roster.ps1                 # full sync
powershell -ExecutionPolicy Bypass -File run-roster.ps1 -Mode --dry-run
```

## Daily schedule (Windows Task Scheduler)

`run-roster.ps1` is self-contained: it launches the dedicated profile headless on
port 9223, runs the full sync, and shuts that Chrome down. Output goes to
`roster-run.log`.

Register a daily task (run once, in PowerShell). It runs when you are logged on,
and catches up if a run was missed:
```powershell
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument '-NoProfile -ExecutionPolicy Bypass -File "<FULL-PATH>\roster-agent\run-roster.ps1"'
$trigger = New-ScheduledTaskTrigger -Daily -At 6:00am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName 'CrustCrumbRosterSync' -Action $action -Trigger $trigger `
  -Settings $settings -Description 'Daily Skool roster sync for Crust & Crumb Helper' -Force
```
Replace `<FULL-PATH>` with this folder's path. Check it ran via `roster-run.log`
or Task Scheduler history.

## Selector maintenance

All the brittle, Skool-specific bits live in `selectors.json`. If a read returns 0
members or wrong fields, run `--probe`, compare the sample HTML to the selectors,
and fix that file. No code change needed.

## What it reads (P0 scope)

Name, Skool username, profile URL, join date, last active. The directory does not
expose post/comment counts, so the `at_risk` engagement bucket can't be computed
from it (an occasional CSV import or a later per-profile read covers that).
Application answers also live off the directory; they're wired in P1 (auto-welcome).

## Safety

- Rides a saved session, no credentials stored.
- Human-paced, randomized delays. Not a scraper.
- A zero-member read is rejected here and on the server, so a broken read can never
  flag your whole roster as missing.
- Reconciliation never deletes a member. It flags drift for you to review.
