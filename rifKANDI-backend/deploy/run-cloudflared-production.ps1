$ErrorActionPreference = 'Stop'

# Credentials live outside the repository under ProgramData. This script only
# points Cloudflare Tunnel at the reviewed production ingress configuration.
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' '--config' 'C:\ProgramData\cloudflared\rifkando-api-origin.yml' 'tunnel' 'run'
exit $LASTEXITCODE
