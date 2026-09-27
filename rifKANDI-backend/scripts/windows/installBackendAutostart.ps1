[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$Remove,
  [switch]$UserAtLogon
)

$ErrorActionPreference = 'Stop'

$taskName = if ($UserAtLogon) { 'rifKANDO Backend API (User)' } else { 'rifKANDO Backend API' }
$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$runner = Join-Path $PSScriptRoot 'runBackend.ps1'

if ($Remove) {
  if (-not $Apply) {
    Write-Host "Dry run: would remove scheduled task '$taskName'. Re-run with -Remove -Apply to remove it."
    exit 0
  }
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed scheduled task '$taskName'."
  exit 0
}

$action = New-ScheduledTaskAction `
  -Execute $powershell `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
  -WorkingDirectory $backendRoot
$identity = "$env:USERDOMAIN\$env:USERNAME"
$trigger = if ($UserAtLogon) {
  New-ScheduledTaskTrigger -AtLogOn -User $identity
} else {
  New-ScheduledTaskTrigger -AtStartup
}
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 3650)
$principal = if ($UserAtLogon) {
  New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
} else {
  New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
}

if (-not $Apply) {
  $mode = if ($UserAtLogon) { 'when the current Windows user signs in' } else { 'at Windows startup as SYSTEM' }
  Write-Host "Dry run: would register '$taskName' $mode."
  Write-Host "Runner: $runner"
  Write-Host "Working directory: $backendRoot"
  if ($UserAtLogon) {
    Write-Host 'Re-run with -UserAtLogon -Apply to install it without administrator access.'
  } else {
    Write-Host 'Use an elevated PowerShell and re-run with -Apply, or use -UserAtLogon -Apply for the secure non-admin fallback.'
  }
  exit 0
}

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
} catch {
  if (-not $UserAtLogon -and $_.Exception.Message -match 'Access is denied') {
    throw 'Administrator access is required for the SYSTEM startup task. Use an elevated PowerShell, or run this installer with -UserAtLogon -Apply for automatic startup after your Windows sign-in.'
  }
  throw
}
$task = Get-ScheduledTask -TaskName $taskName
$taskInfo = Get-ScheduledTaskInfo -TaskName $taskName

Write-Host "Installed '$taskName'."
Write-Host "State: $($task.State); last result: $($taskInfo.LastTaskResult)"
Write-Host 'The installer does not replace an already-running backend process. Restart the task during a controlled handover after confirming port 5000 is available.'
