# Crust & Crumb roster sync — scheduled runner.
# Launches the dedicated automation Chrome profile (already signed in to Skool),
# runs the roster read, then shuts that Chrome down. Self-contained: it does not
# touch your everyday browser. Intended for a daily Windows Scheduled Task.
#
#   powershell -ExecutionPolicy Bypass -File run-roster.ps1            # full sync (default)
#   powershell -ExecutionPolicy Bypass -File run-roster.ps1 -Mode --dry-run
#   powershell -ExecutionPolicy Bypass -File run-roster.ps1 -Headless:$false   # visible window

param(
  [string]$Mode = "--full",
  [bool]$Headless = $true,
  [string]$EnvFile = ".env"
)

$AgentDir = $PSScriptRoot
$Chrome   = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$ProfileDir = Join-Path $env:USERPROFILE "roster-agent-profile"
$Port     = 9223
$Log      = Join-Path $AgentDir "roster-run.log"

function Log($m) { "$(Get-Date -Format o)  $m" | Tee-Object -FilePath $Log -Append }

Log "=== roster sync start (mode=$Mode headless=$Headless env=$EnvFile) ==="

$chromeArgs = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$ProfileDir",
  "--no-first-run", "--no-default-browser-check",
  "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows"
)
if ($Headless) { $chromeArgs += @("--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage") }
else { $chromeArgs += @("--window-position=-32000,-32000", "--window-size=1280,900") }
$chromeArgs += "about:blank"

$proc = Start-Process -PassThru -FilePath $Chrome -ArgumentList $chromeArgs
try {
  # Wait for the debug endpoint to answer.
  $up = $false
  for ($i = 0; $i -lt 25; $i++) {
    try { Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/json/version" -TimeoutSec 3 | Out-Null; $up = $true; break }
    catch { Start-Sleep -Seconds 1 }
  }
  if (-not $up) { Log "ERROR: Chrome debug port never came up"; exit 1 }

  # Resolve node by full path. Prefer the real install; the task environment can
  # surface a bogus System32 app-execution-alias stub via PATH/Get-Command.
  $node = "C:\Program Files\nodejs\node.exe"
  if (-not (Test-Path $node)) {
    $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  }
  if (-not $node -or -not (Test-Path $node)) { Log "ERROR: node not found"; exit 1 }
  Log "using node: $node"

  Push-Location $AgentDir
  & $node "--env-file=$EnvFile" read-roster.mjs $Mode *>> $Log
  $code = $LASTEXITCODE
  Pop-Location
  Log "agent exit code: $code"
  exit $code
}
finally {
  if ($proc -and -not $proc.HasExited) {
    & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null
  }
  Log "=== roster sync end ==="
}
