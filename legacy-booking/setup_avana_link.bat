@echo off
echo ======================================================
echo Setting up 'avana-booking' link on this computer...
echo This requires Administrator privileges.
echo ======================================================
echo.

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrative privileges.
) else (
    echo [ERROR] Please right-click this file and select "Run as administrator".
    echo.
    pause
    exit /b
)

:: Define the mapping
set IP_ADDRESS=192.168.1.38
set HOST_NAME=avana-booking

:: Check if the host name already exists in hosts file
findstr /I "%HOST_NAME%" %SystemRoot%\System32\drivers\etc\hosts >nul
if %errorLevel% == 0 (
    echo [INFO] '%HOST_NAME%' is already mapped in your hosts file.
) else (
    echo. >> %SystemRoot%\System32\drivers\etc\hosts
    echo %IP_ADDRESS% %HOST_NAME% >> %SystemRoot%\System32\drivers\etc\hosts
    echo [SUCCESS] Mapped '%HOST_NAME%' to %IP_ADDRESS% in your hosts file.
)

echo.
echo ======================================================
echo Now you can open the website in your browser using:
echo http://%HOST_NAME%:3000
echo ======================================================
echo.
pause
