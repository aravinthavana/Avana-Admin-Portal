@echo off
title Avana Help Desk - Update Outlook Password
color 0B
echo =======================================================================
echo         Avana Help Desk - Automatic Outlook Password Setup
echo =======================================================================
echo.
echo Please paste or type your Outlook Password (or App Password) below:
echo.
set /p OUTLOOK_PASS=Password: 

if "%OUTLOOK_PASS%"=="" (
    echo.
    echo No password was entered. No changes made.
    pause
    exit /b
)

echo.
echo Updating .env file...

:: Create a temporary file with new contents
echo PORT=3000> "%~dp0.env.tmp"
echo ADMIN_PASSWORD=admin123>> "%~dp0.env.tmp"
echo ADMIN_EMAIL=Karthicksankar@avanamedical.com>> "%~dp0.env.tmp"
echo BASE_URL=http://avana-booking:3000>> "%~dp0.env.tmp"
echo.>> "%~dp0.env.tmp"
echo # Company Email SMTP Configuration (Microsoft 365 / Outlook)>> "%~dp0.env.tmp"
echo SMTP_HOST=smtp.office365.com>> "%~dp0.env.tmp"
echo SMTP_PORT=587>> "%~dp0.env.tmp"
echo SMTP_USER=Karthicksankar@avanamedical.com>> "%~dp0.env.tmp"
echo SMTP_PASS=%OUTLOOK_PASS%>> "%~dp0.env.tmp"
echo SMTP_FROM=Karthicksankar@avanamedical.com>> "%~dp0.env.tmp"
echo.>> "%~dp0.env.tmp"
echo # Twilio SMS settings (optional)>> "%~dp0.env.tmp"
echo # TWILIO_ACCOUNT_SID=your_twilio_sid>> "%~dp0.env.tmp"
echo # TWILIO_AUTH_TOKEN=your_twilio_token>> "%~dp0.env.tmp"
echo # TWILIO_FROM_NUMBER=+12345678901>> "%~dp0.env.tmp"

:: Replace old .env with new one
move /y "%~dp0.env.tmp" "%~dp0.env" >nul

echo.
echo =======================================================================
echo SUCCESS: Your Outlook password has been successfully saved to .env!
echo You can now close this window and start your Help Desk server.
echo =======================================================================
echo.
pause
