@echo off
echo Starting LogixMitra Backend (Django)...
cd /d "%~dp0logixmitra_backend"
"..\tools\python312\python.exe" manage.py runserver 8000
