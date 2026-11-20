@echo off
rem Vesperwrithe: serves the game locally, then opens it.
cd /d "%~dp0"
start "" http://localhost:8410
python tools\serve.py 8410
