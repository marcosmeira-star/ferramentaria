$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$backendPath = Join-Path $PSScriptRoot '..\..\backend'
$backendPath = (Resolve-Path $backendPath).Path
Set-Location $backendPath

function Invoke-Step {
    param([string]$Command)
    Write-Host "==> $Command"
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar: $Command (exit code: $LASTEXITCODE)"
    }
}

Invoke-Step "python -c \"import sys; assert sys.version_info[:2] in [(3,11),(3,12)], 'Use Python 3.11 ou 3.12 x64. Versao atual: ' + sys.version.split()[0]\""

Invoke-Step "python -m venv .venv-build"
Invoke-Step ". .\\.venv-build\\Scripts\\Activate.ps1"

Invoke-Step "python -m pip install --upgrade pip setuptools wheel"
Invoke-Step "python -m pip install --only-binary=:all: -r requirements.txt"
Invoke-Step "python -m pip install --only-binary=:all: pyinstaller"

Invoke-Step "python -m PyInstaller --noconfirm --onefile --name backend --paths . launcher/run_backend.py"

Write-Host 'Build do backend concluído com sucesso.'
