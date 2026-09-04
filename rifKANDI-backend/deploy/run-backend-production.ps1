$ErrorActionPreference = 'Stop'

# Task Scheduler starts in a system directory. Use the backend directory so
# dotenv always loads the production environment beside server.js.
Set-Location (Split-Path -Parent $PSScriptRoot)
& 'C:\Program Files\nodejs\node.exe' 'server.js'
exit $LASTEXITCODE
