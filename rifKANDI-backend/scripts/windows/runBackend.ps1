[CmdletBinding()]
param(
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'

$storageRoot = if ($env:PERSISTENT_STORAGE_ROOT) { $env:PERSISTENT_STORAGE_ROOT } else { 'C:\rifkando-data' }
$logDirectory = Join-Path $storageRoot 'logs'
$logPath = Join-Path $logDirectory 'backend-service.log'

try {
  New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
  $backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  $node = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles 'nodejs\node.exe' }
  if (-not (Test-Path -LiteralPath $node)) {
    throw "Node.js was not found at '$node'."
  }
  Set-Location $backendRoot

  if ($Port -gt 0) {
    $env:PORT = $Port
  }

  "[$(Get-Date -Format o)] Starting rifKANDO backend (PID $PID)." | Add-Content -Path $logPath
  # Windows PowerShell can turn harmless Node stderr warnings into terminating
  # errors when ErrorActionPreference is Stop. Node owns its process exit code;
  # keep diagnostics in the service log without aborting a healthy server.
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $node '--dns-result-order=ipv4first' '--use-system-ca' 'server.js' 2>&1 |
    Out-File -FilePath $logPath -Append -Encoding utf8
  $nodeExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  exit $nodeExitCode
} catch {
  "[$(Get-Date -Format o)] Backend runner failed: $($_.Exception.Message)" | Add-Content -Path $logPath
  exit 1
}
