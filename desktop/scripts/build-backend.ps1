$ErrorActionPreference = 'Stop'
Set-Location "$PSScriptRoot\..\..\backend"

python -m venv .venv-build
. .\.venv-build\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt pyinstaller

pyinstaller --noconfirm --onefile --name backend --paths . launcher/run_backend.py
