@echo off
rem Startet Roma Vivit: installiert beim ersten Mal Vite und oeffnet dann den Dev-Server im Browser.
cd /d "%~dp0"
if not exist "node_modules\vite" call npm.cmd install
call npm.cmd run dev
pause
