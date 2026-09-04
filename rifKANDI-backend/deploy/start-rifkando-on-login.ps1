$ErrorActionPreference = 'Stop'

$backendRoot = Split-Path -Parent $PSScriptRoot
$backendLog = 'C:\rifkando-data\backend.log'
$backendErrorLog = 'C:\rifkando-data\backend.error.log'
$tunnelLog = 'C:\rifkando-data\cloudflared-api.log'
$tunnelErrorLog = 'C:\rifkando-data\cloudflared-api.error.log'
$tunnelConfig = 'C:\ProgramData\cloudflared\rifkando-api-origin.yml'

if (-not (Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' `
    -ArgumentList 'server.js' `
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
