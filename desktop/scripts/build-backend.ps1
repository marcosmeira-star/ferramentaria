$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\..\..\backend"

python -c "import sys; assert sys.version_info[:2] in [(3,11),(3,12)], f'Use Python 3.11 ou 3.12 x64. Versão atual: {sys.version.split()[0]}'"

python -m venv .venv-build
. .\.venv-build\Scripts\Activate.ps1

python -m pip install --upgrade pip setuptools wheel
python -m pip install --only-binary=:all: -r requirements.txt
python -m pip install --only-binary=:all: pyinstaller

python -m PyInstaller --noconfirm --onefile --name backend --paths . launcher/run_backend.py
