@echo off
REM THE BACKROOMS — double-click this file on Windows to play.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get it free at https://nodejs.org then run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First-time setup, about a minute...
  call npm install --no-fund --no-audit
)
if not exist dist\index.html (
  echo Building the game...
  call npm run build
)

echo.
echo ===============================================
echo   THE BACKROOMS is running.
echo   Play here:  http://localhost:8787?anydevice=1
echo   Press Ctrl+C in this window to stop.
echo ===============================================
echo.
start http://localhost:8787?anydevice=1
node server\server.js
