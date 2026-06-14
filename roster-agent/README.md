# Roster Agent (P0)

The eyes inside Skool. This is a small local script that reads your member
directory from your own logged-in Chrome and posts it to the Helper's
`ingest-roster` endpoint, so the app's member data stays fresh without you
exporting a CSV. It runs on a daily schedule on your machine.

It behaves like you working by hand: it rides your existing Chrome session,
moves at a human pace, and stops loudly if the page looks wrong. It never
stores your password and never posts an empty read.

## One-time setup

1. Install dependencies (downloads a browser engine for Playwright):
   ```
   cd roster-agent
   npm install
   npx playwright install chromium
   ```
2. Copy `.env.example` to `.env` and fill in your `INGEST_API_KEY`.
3. Make sure the `ingest-roster` function and the roster migration are
   published to Supabase (Henry does this through Lovable, see the handoff
   note from Claude).

## Running it

The agent talks to Chrome over the remote-debugging port, so Chrome must be
started with debugging on, using your **normal profile** (the one already
signed in to Skool). Close other Chrome windows first, then:

```
# Windows (PowerShell), normal profile:
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory="Default"
```

Then, in the `roster-agent` folder:

```
node --env-file=.env read-roster.mjs --probe     # confirm selectors, posts nothing
node --env-file=.env read-roster.mjs --dry-run   # full read, prints payload, posts nothing
node --env-file=.env read-roster.mjs             # full read, posts to the Helper
```

**First run: use `--probe`.** Skool's page structure is undocumented and
changes. Probe prints how many member cards matched and a sample of the card
HTML. Use it to confirm or fix the selectors in `selectors.json`, which is the
one place you ever need to edit when a read breaks. Then `--dry-run` to eyeball
the data, then a real run.

## Selector maintenance

All the brittle, Skool-specific bits live in `selectors.json`. When a read
returns 0 members or wrong fields, that is almost always a selector that
needs updating. Run `--probe`, compare the sample HTML to the selectors, fix
the file. No code change needed.

## Scheduling (daily, Windows Task Scheduler)

Daily is plenty. The agent needs Chrome running with the debug port, so the
simplest reliable setup is a single batch file the task runs, which launches
Chrome with debugging, waits a moment, runs the agent, and closes:

1. Create `run-roster.cmd` (kept out of git) with your paths:
   ```
   @echo off
   start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory="Default"
   timeout /t 8 /nobreak >nul
   cd /d "%~dp0"
   node --env-file=.env read-roster.mjs
   ```
2. Task Scheduler -> Create Task -> Trigger: Daily, a time you are usually
   logged in. Action: Start a program -> point it at `run-roster.cmd`.
   Run only when the user is logged on (it needs your desktop session).

If a run fails, the agent exits non-zero and prints the reason. Pair the task
with an email-on-failure action if you want a nudge.

## What it reads (P0 scope)

Name, Skool username, profile URL, join date, last active, post and comment
counts from the member directory. Application answers usually are not on the
directory page; they show in the pending/approval view and member profiles.
Capturing those is wired in P1 (the auto-welcome), where it matters most.

## Safety

- Rides your session, no credentials stored.
- Human-paced, randomized delays. Not a scraper.
- A zero-member read is rejected both here and on the server, so a broken
  read can never flag your whole roster as missing.
- Reconciliation never deletes a member. It flags drift for you to review.
