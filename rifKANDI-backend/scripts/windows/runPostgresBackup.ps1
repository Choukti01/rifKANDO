[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackendRoot,
  [Parameter(Mandatory = $true)]
  [string]$StatePath
)

$ErrorActionPreference = 'Stop'

function Read-BackupState {
  if (-not (Test-Path -LiteralPath $StatePath)) { return @{} }
  try { return Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json -AsHashtable } catch { return @{} }
}

function Write-BackupState([hashtable]$State) {
  $directory = Split-Path -Parent $StatePath
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  $temporaryPath = "$StatePath.tmp"
  $State | ConvertTo-Json -Compress | Set-Content -LiteralPath $temporaryPath -Encoding UTF8
  Move-Item -LiteralPath $temporaryPath -Destination $StatePath -Force
}

$state = Read-BackupState
$state.lastAttemptAt = [DateTime]::UtcNow.ToString('o')
Write-BackupState $state

try {
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  & $node --use-system-ca (Join-Path $BackendRoot 'scripts\postgresBackupToR2.js')
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL backup exited with code $LASTEXITCODE." }

  $state = Read-BackupState
  $state.lastSuccessAt = [DateTime]::UtcNow.ToString('o')
  $state.successfulDate = (Get-Date).ToString('yyyy-MM-dd')
  $state.lastError = $null
  Write-BackupState $state
  Write-Output 'rifKANDO PostgreSQL backup completed.'
} catch {
  $state = Read-BackupState
  $state.lastError = $_.Exception.Message
  $state.lastFailureAt = [DateTime]::UtcNow.ToString('o')
  Write-BackupState $state
  throw
}
