## What's going on

Both `run-both.ps1` and `run-both.bat` exist in the project repo (I just re-verified). Your local `roster-agent/` doesn't have them, which means your local copy is a snapshot taken before those files landed — not a bug in the project.

## Fix (pick one)

### Option A — Re-pull from GitHub (cleanest)
If your local folder is a git clone of the Lovable-connected GitHub repo:

```
cd roster-agent
git pull
dir run-both.*
```

You should see both files appear.

### Option B — Create the two files by hand (30 seconds, no git)
In your local `roster-agent/` folder, create these two files with exactly this content.

**`run-both.ps1`**
```powershell
param([string]$Mode = "--full")

$AgentDir = $PSScriptRoot
$Runner   = Join-Path $AgentDir "run-roster.ps1"

Write-Host "--- CCA sync ---"
& powershell -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode $Mode -EnvFile ".env"
$cca = $LASTEXITCODE

Write-Host "--- FOTM sync ---"
& powershell -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode $Mode -EnvFile ".env.fotm"
$fotm = $LASTEXITCODE

Write-Host "CCA exit=$cca  FOTM exit=$fotm"
if ($cca -ne 0 -or $fotm -ne 0) { exit 1 } else { exit 0 }
```

**`run-both.bat`**
```
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-both.ps1"
pause
```

Then double-click `run-both.bat` to run CCA + FOTM back-to-back.

## What I need from you before doing anything on my side

Nothing to build in the project — the files are already there. Just tell me if Option A or Option B worked, or paste the output of `git remote -v` and `git status` from `roster-agent/` if the pull didn't bring them down and you want me to dig further.
