$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\..\..\backend"

python -m venv .venv-build
. .\.venv-build\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements.txt pyinstaller

python -m PyInstaller --noconfirm --onefile --name backend --paths . launcher/run_backend.py
