param([switch]$Watch)

$ErrorActionPreference = 'Stop'

$backendRoot = Split-Path -Parent $PSScriptRoot
$backendLog = 'C:\rifkando-data\backend.log'
$backendErrorLog = 'C:\rifkando-data\backend.error.log'
$tunnelLog = 'C:\rifkando-data\cloudflared-api.log'
$tunnelErrorLog = 'C:\rifkando-data\cloudflared-api.error.log'
$backupLog = 'C:\rifkando-data\postgres-backup.log'
$backupErrorLog = 'C:\rifkando-data\postgres-backup.error.log'
$backupStatePath = 'C:\rifkando-data\postgres-backup-state.json'
$backupRunner = Join-Path $backendRoot 'scripts\windows\runPostgresBackup.ps1'
$tunnelConfig = 'C:\ProgramData\cloudflared\rifkando-api-origin.yml'
$watchdogMutex = New-Object System.Threading.Mutex($false, 'Global\rifKANDOProductionWatchdog')

# The scheduled task can occasionally be launched more than once (for example
# after sign-in and a task retry). Only one watchdog may manage the API, or two
# Node processes can race to bind port 5000 and leave misleading EADDRINUSE logs.
if (-not $watchdogMutex.WaitOne(0, $false)) {
  exit 0
}

function Ensure-rifKANDOProductionProcesses {
  if (-not (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' `
      -ArgumentList @('--dns-result-order=ipv4first', '--use-system-ca', 'server.js') `
      -WorkingDirectory $backendRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $backendLog `
      -RedirectStandardError $backendErrorLog
  }

  $localTunnel = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$tunnelConfig*" }

  if (-not $localTunnel) {
    Start-Process -FilePath 'C:\Program Files (x86)\cloudflared\cloudflared.exe' `
      -ArgumentList @('--config', $tunnelConfig, 'tunnel', 'run') `
      -WindowStyle Hidden `
      -RedirectStandardOutput $tunnelLog `
      -RedirectStandardError $tunnelErrorLog
  }

  # Task Scheduler can be unavailable on a personal Windows installation.
  # The production watchdog is already always running while this local origin
  # is available, so it safely owns the once-daily backup fallback.
  $now = Get-Date
  $today = $now.ToString('yyyy-MM-dd')
  $backupSlot = $now.Date.AddHours(2).AddMinutes(30)
  $backupState = @{}
  if (Test-Path -LiteralPath $backupStatePath) {
    try { $backupState = Get-Content -LiteralPath $backupStatePath -Raw | ConvertFrom-Json -AsHashtable } catch { $backupState = @{} }
  }
  $backupProcess = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*$backupRunner*" }
  $lastAttempt = [DateTime]::MinValue
  $hasLastAttempt = $backupState.lastAttemptAt -and [DateTime]::TryParse($backupState.lastAttemptAt, [ref]$lastAttempt)
  if (-not $hasLastAttempt) { $lastAttempt = $null }
  $attemptedRecently = $lastAttempt -and (([DateTime]::UtcNow - $lastAttempt.ToUniversalTime()).TotalMinutes -lt 60)

  if ($now -ge $backupSlot -and $backupState.successfulDate -ne $today -and -not $backupProcess -and -not $attemptedRecently) {
    Start-Process -FilePath 'powershell.exe' `
      -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $backupRunner, '-BackendRoot', $backendRoot, '-StatePath', $backupStatePath) `
      -WindowStyle Hidden `
      -RedirectStandardOutput $backupLog `
      -RedirectStandardError $backupErrorLog
  }
}

try {
  do {
    Ensure-rifKANDOProductionProcesses
    if (-not $Watch) { break }
    Start-Sleep -Seconds 20
  } while ($true)
} finally {
  $watchdogMutex.ReleaseMutex()
  $watchdogMutex.Dispose()
}
