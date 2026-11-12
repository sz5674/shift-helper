@echo off
cd /d "%~dp0"
rem Fixed port: localStorage is per origin, so changing the port would hide saved data.
rem Already running? Just open the browser.
netstat -ano | findstr ":5180 " | findstr LISTENING >nul
if not errorlevel 1 (
  start "" http://localhost:5180
  exit /b
)
if not exist node_modules call npm install
call npx vite --port 5180 --strictPort --open
