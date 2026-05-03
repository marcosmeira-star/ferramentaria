$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..')).Path
$desktopPath = (Resolve-Path (Join-Path $repoRoot 'desktop')).Path
$backendExe = Join-Path $repoRoot 'backend\dist\backend.exe'
$iconPath = Join-Path $desktopPath 'assets\app.ico'

if (-not (Test-Path $backendExe)) {
    throw "backend.exe não encontrado em '$backendExe'. Execute antes: .\desktop\scripts\build-backend.ps1"
}

if (-not (Test-Path $iconPath)) {
    throw "Ícone não encontrado: $iconPath"
}

$iconInfo = Get-Item $iconPath
if ($iconInfo.Length -lt 100) {
    throw "Ícone inválido (muito pequeno): $iconPath. Substitua por um .ico válido (16/32/48/256)."
}

Push-Location $desktopPath
try {
    Write-Host '==> npm install'
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'Falha no npm install' }

    Write-Host '==> npm run dist:win'
    npm run dist:win
    if ($LASTEXITCODE -ne 0) { throw 'Falha no npm run dist:win' }
}
finally {
    Pop-Location
}
