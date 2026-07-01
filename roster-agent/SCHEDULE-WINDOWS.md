# Schedule `run-both.bat` on Windows (both communities, daily)

This puts your CCA + FOTM roster syncs on a hands-off daily schedule using
Windows Task Scheduler. Log output stays in `roster-run.log` next to the
script so you can spot problems the morning after.

## One-time setup

1. Open **Task Scheduler** (Start → type "Task Scheduler" → Enter).
2. Right side → **Create Task…** (not "Create Basic Task").
3. **General** tab:
   - **Name:** `CrustCrumbRosterSyncBoth`
   - **Description:** Daily Skool roster sync for CCA + FOTM.
   - **Security options:** select **Run whether user is logged on or not**
     is fine, but the simpler choice is **Run only when user is logged on**
     (Chrome needs a real user session to keep the profile cookies valid).
   - Check **Run with highest privileges**.
4. **Triggers** tab → **New…**
   - **Begin the task:** On a schedule.
   - **Daily**, start at **6:00:00 AM** (or whenever suits you).
   - Recur every **1** day. **OK**.
5. **Actions** tab → **New…**
   - **Action:** Start a program.
   - **Program/script:** `powershell.exe`
   - **Add arguments:** paste this exactly (adjust the path):
     ```
     -NoProfile -ExecutionPolicy Bypass -File "C:\Path\To\roster-agent\run-both.ps1"
     ```
   - **Start in:** `C:\Path\To\roster-agent`
   - **OK**.
6. **Conditions** tab:
   - Uncheck **Start the task only if the computer is on AC power** (so it
     still runs on battery).
7. **Settings** tab:
   - Check **Allow task to be run on demand**.
   - Check **If the task fails, restart every: 15 minutes / up to 3 times**.
   - Check **Start the task as soon as possible after a scheduled start is
     missed** (catches you up after a laptop-closed day).
   - **Stop the task if it runs longer than: 1 hour**.
8. Click **OK**. It will prompt for your Windows password if you chose
   "Run whether user is logged on or not."

## Verify it works

- In Task Scheduler, right-click `CrustCrumbRosterSyncBoth` → **Run**.
- Wait ~2 min, then open `roster-agent\roster-run.log`. You should see two
  `=== roster sync start ===` blocks and both ending with `agent exit code: 0`.
- Open `/admin/segments` — the `cca_all` and `fotm_all` counts should reflect
  today's roster.

## Logs

- **`roster-run.log`** — appended to on every run. This is your first stop
  when something looks off. Tail the last ~50 lines to see the most recent
  exit codes and any errors.
- Task Scheduler history — right-click the task → **History** tab shows when
  Windows attempted the run and the exit code.
- Rotate the log manually every month or two so it doesn't grow forever:
  ```powershell
  Move-Item .\roster-run.log .\roster-run.$(Get-Date -Format yyyyMM).log
  ```

## Common gotchas

- **Chrome not signed in to Skool anymore.** Re-do the one-time profile
  login step from `README.md`, then run the task on demand to confirm.
- **`node not found`.** Install Node.js from nodejs.org (LTS build). The
  runner looks for it at `C:\Program Files\nodejs\node.exe` first.
- **Task doesn't run when laptop is closed.** That's expected — either
  leave the laptop open, keep it plugged in with lid-close set to "do
  nothing" in Power Options, or switch to a Windows machine that stays on.
