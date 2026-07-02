@echo off
title Avana Conference Room Booking Server
echo ==========================================
echo   Avana Conference Room Booking Server
echo ==========================================
echo.
echo Server starting on http://192.168.1.84:3000
echo Status page: http://192.168.1.84:3000/status
echo Admin page:  http://192.168.1.84:3000/admin
echo.
echo [DO NOT CLOSE THIS WINDOW]
echo.
cd /d "C:\Users\SKarthick\OneDrive - Avana Group\Desktop\booking"
agy-node server.js
pause
