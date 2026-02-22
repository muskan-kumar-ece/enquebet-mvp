# Starts the backend in local development using Daphne (ASGI)
# - Defaults to IPv4 loopback to avoid Windows localhost/IPv6 issues.
# - Uses the local venv if it exists.

param(
    [string]$HostAddress = '127.0.0.1',
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot 'venv\Scripts\python.exe'
if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $python = 'python'
}

# Ensure daphne is installed (present in requirements.txt).
& $python -m daphne -b $HostAddress -p $Port config.asgi:application
