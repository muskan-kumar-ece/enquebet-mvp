# Start ENQUEbet backend + frontend for local dev (Windows/PowerShell)
# - Backend: Daphne (ASGI) bound to IPv4 loopback by default
# - Frontend: Next dev server
#
# Usage:
#   ./dev.ps1
#   ./dev.ps1 -BackendPort 8001 -FrontendPort 3001
#
param(
    [string]$BackendHostAddress = '127.0.0.1',
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'

if (!(Test-Path $backendDir)) { throw "Missing backend folder: $backendDir" }
if (!(Test-Path $frontendDir)) { throw "Missing frontend folder: $frontendDir" }

Write-Host "Starting backend (Daphne) on http://$BackendHostAddress`:$BackendPort ..."
Start-Process -FilePath 'powershell' -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$backendDir'; ./dev.ps1 -HostAddress '$BackendHostAddress' -Port $BackendPort"
)

Write-Host "Starting frontend (Next.js) on http://localhost`:$FrontendPort ..."
Start-Process -FilePath 'powershell' -ArgumentList @(
    '-NoExit',
    '-Command',
    (
        "Set-Location '$frontendDir'; " +
        # Ensure the frontend points at the same backend host/port, without needing file edits.
        "`$env:NEXT_PUBLIC_API_URL='http://$BackendHostAddress`:$BackendPort/api/v1'; " +
        "`$env:NEXT_PUBLIC_WS_URL='ws://$BackendHostAddress`:$BackendPort'; " +
        "npx next dev -p $FrontendPort"
    )
)

Write-Host "Done. Close either spawned window to stop that service."