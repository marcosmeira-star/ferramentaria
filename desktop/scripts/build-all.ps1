$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..')).Path
$backendExe = Join-Path $repoRoot 'backend\dist\backend.exe'

& (Join-Path $scriptDir 'build-backend.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Falha no build-backend.ps1' }

if (-not (Test-Path $backendExe)) {
    throw "backend.exe não gerado: $backendExe"
}

& (Join-Path $scriptDir 'build-desktop.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Falha no build-desktop.ps1' }