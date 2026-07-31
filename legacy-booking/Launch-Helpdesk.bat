@echo off
title Avana Help Desk Launcher
echo ==========================================
echo    Avana Help Desk Desktop Launcher
echo ==========================================
echo.
echo Check if server is already running...

:: Check if port 3000 is active
netstat -o -an | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [OK] Server is already active.
    goto launch
)

echo Starting Node.js backend server in background...
:: Starts server.js in a minimized command prompt window
start /min "Avana Help Desk Server" agy-node server.js

:: Wait 2 seconds for server boot-up
timeout /t 2 /nobreak >nul

:launch
echo Launching Avana Help Desk Standalone App...

:: 1. Try launching Google Chrome in standalone App mode (hides browser tabs/address bar)
start "" chrome.exe --app=http://localhost:3000
if %errorlevel% equ 0 goto success

:: 2. Try launching Microsoft Edge in standalone App mode if Chrome is not present
start "" msedge.exe --app=http://localhost:3000
if %errorlevel% equ 0 goto success

:: 3. Fallback to default browser if app mode launch fails
start http://localhost:3000

:success
echo Launch complete!
timeout /t 1 >nul
exit
