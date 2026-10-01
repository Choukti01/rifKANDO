[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$taskName = 'rifKANDO PostgreSQL R2 Backup'
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node = (Get-Command node.exe -ErrorAction Stop).Source
$pgDumpCommand = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
$pgDump = if ($pgDumpCommand) {
  $pgDumpCommand.Source
} else {
  # The PostgreSQL Windows installer does not always add its client tools to
  # PATH. Discover an installed official pg_dump without guessing a version.
  Get-ChildItem -Path (Join-Path $env:ProgramFiles 'PostgreSQL') -Filter 'pg_dump.exe' -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

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
$systemPrincipal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$interactiveUser = if ($env:USERDOMAIN) { "$env:USERDOMAIN\\$env:USERNAME" } else { $env:USERNAME }
$userPrincipal = New-ScheduledTaskPrincipal -UserId $interactiveUser -LogonType Interactive -RunLevel Limited

if (-not $Apply) {
  Write-Host "Dry run: would register '$taskName' for 02:30 every day."
  Write-Host "pg_dump: $($pgDump.Source)"
  exit 0
}

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $systemPrincipal -Force | Out-Null
  Write-Host "Installed '$taskName' as SYSTEM."
} catch {
  # A non-administrator can still create an interactive task for their own
  # Windows session. This is appropriate here because the current production
  # backend also runs under that signed-in account.
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $userPrincipal -Force | Out-Null
  Write-Host "Installed '$taskName' for the signed-in user ($interactiveUser)."
}
