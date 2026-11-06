@echo off
title CareerHub AI - Startup
color 0A

echo.
echo  ========================================
echo   CareerHub AI - Starting All Services
echo  ========================================
echo.

:: Start MongoDB if not running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe" >NUL
if "%ERRORLEVEL%"=="1" (
    echo [1/3] Starting MongoDB...
    if not exist "C:\data\db" mkdir "C:\data\db"
    start "" /B "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db" --port 27017
    timeout /t 3 /nobreak >NUL
    echo       MongoDB started on port 27017
) else (
    echo [1/3] MongoDB already running ^(OK^)
)

:: Kill any old Node.js server on port 3000
echo [2/3] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >NUL 2>&1
)
timeout /t 1 /nobreak >NUL

:: Start CareerHub AI server
echo [3/3] Starting CareerHub AI server...
cd /d "c:\Users\gauta\Downloads\CareerHub Ai"
start "" /B node backend/server.js
timeout /t 3 /nobreak >NUL

echo.
echo  ========================================
echo   CareerHub AI is READY!
echo   Open: http://localhost:3000
echo  ========================================
echo.

:: Open browser
start "" "http://localhost:3000"

echo  Press any key to stop all services...
pause >NUL

:: Cleanup on exit
echo Stopping services...
taskkill /IM node.exe /F >NUL 2>&1
echo Done.
