[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$taskName = 'rifKANDO PostgreSQL R2 Backup'
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node = (Get-Command node.exe -ErrorAction Stop).Source
$pgDump = Get-Command pg_dump.exe -ErrorAction SilentlyContinue

if ($Remove) {
  if (-not $Apply) {
    Write-Host "Dry run: would remove scheduled task '$taskName'. Re-run with -Remove -Apply to remove it."
    exit 0
  }
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task '$taskName'."
  exit 0
}

if (-not $pgDump) {
  throw 'pg_dump.exe is required for PostgreSQL backups. Install the official PostgreSQL client tools first; this task is intentionally not created until a real backup can run.'
}

$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "--use-system-ca `"$backendRoot\scripts\postgresBackupToR2.js`"" `
  -WorkingDirectory $backendRoot
$trigger = New-ScheduledTaskTrigger -Daily -At 02:30
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 15) `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

if (-not $Apply) {
  Write-Host "Dry run: would register '$taskName' for 02:30 every day."
  Write-Host "pg_dump: $($pgDump.Source)"
  exit 0
}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Installed '$taskName'."
