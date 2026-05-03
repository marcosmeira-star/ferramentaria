$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-SupportedPython {
    # Prioriza Python Launcher do Windows
    $candidates = @('3.12', '3.11')
    foreach ($v in $candidates) {
        try {
            & py -$v -c "import sys; print(sys.executable)" 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { return "py -$v" }
        } catch { }
    }

    # Fallback para 'python' se já estiver em 3.11/3.12
    try {
        & python -c "import sys; import platform; ok=sys.version_info[:2] in [(3,11),(3,12)]; print('ok' if ok else 'bad')" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { return 'python' }
    } catch { }

    throw "Python compatível não encontrado. Instale Python 3.11 ou 3.12 x64 (com py launcher)."
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter()][string]$WorkingDir
    )

    if ($WorkingDir) { Push-Location $WorkingDir }
    try {
        Write-Host "==> $Command"
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao executar: $Command (exit code: $LASTEXITCODE)"
        }
    }
    finally {
        if ($WorkingDir) { Pop-Location }
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..\..')).Path
$backendPath = (Resolve-Path (Join-Path $repoRoot 'backend')).Path
$requirementsPath = Join-Path $backendPath 'requirements.txt'
$launcherPath = Join-Path $backendPath 'launcher\run_backend.py'

if (-not (Test-Path $requirementsPath)) { throw "Arquivo não encontrado: $requirementsPath" }
if (-not (Test-Path $launcherPath)) { throw "Arquivo não encontrado: $launcherPath" }

$pyCmd = Get-SupportedPython
Write-Host "Python selecionado: $pyCmd"

Invoke-Step -Command "$pyCmd -c \"import sys; assert sys.version_info[:2] in [(3,11),(3,12)], 'Use Python 3.11 ou 3.12 x64. Versao atual: ' + sys.version.split()[0]\""

Invoke-Step -Command "$pyCmd -m venv .venv-build" -WorkingDir $backendPath

$venvPython = Join-Path $backendPath '.venv-build\Scripts\python.exe'
if (-not (Test-Path $venvPython)) { throw "Python da venv não encontrado: $venvPython" }

Invoke-Step -Command "& '$venvPython' -m pip install --upgrade pip setuptools wheel"
Invoke-Step -Command "& '$venvPython' -m pip install --only-binary=:all: -r '$requirementsPath'"
Invoke-Step -Command "& '$venvPython' -m pip install --only-binary=:all: pyinstaller"
Invoke-Step -Command "& '$venvPython' -m PyInstaller --noconfirm --onefile --name backend --distpath '$backendPath\dist' --workpath '$backendPath\build' --specpath '$backendPath' --paths '$backendPath' '$launcherPath'"

$backendExe = Join-Path $backendPath 'dist\backend.exe'
if (-not (Test-Path $backendExe)) { throw "Falha: backend.exe não foi gerado em $backendExe" }

Write-Host "Build do backend concluído com sucesso: $backendExe"
