# One-click roster sync for BOTH communities (CCA + FOTM).
# Runs the CCA read using .env, then the FOTM read using .env.fotm. Each call
# to run-roster.ps1 launches and tears down its own headless Chrome, so the
# two runs are fully independent — if one fails, the other still runs.
#
#   powershell -ExecutionPolicy Bypass -File run-both.ps1
#
# Or double-click run-both.bat (sits next to this file).

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
