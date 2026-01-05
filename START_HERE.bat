@echo off
cls
echo.
echo ========================================
echo   SHINSEI-SHONIN - Quick Start Menu
echo ========================================
echo.
echo Choose your access method:
echo.
echo [1] Local Network Access (192.168.3.5:3000)
echo     - Fastest, no setup needed
echo     - Only works on same network
echo.
echo [2] Internet Access (ngrok - automatic)
echo     - Works from anywhere
echo     - Auto-setup everything
echo.
echo [3] Stop All Services
echo.
echo [4] Exit
echo.
echo ========================================
echo.

choice /c 1234 /n /m "Select option (1-4): "

if errorlevel 4 goto :exit
if errorlevel 3 goto :stop
if errorlevel 2 goto :internet
if errorlevel 1 goto :local

:local
echo.
echo Starting local network access...
echo.
echo Servers are already running at:
echo   Frontend: http://192.168.3.5:3000
echo   Backend:  http://192.168.3.5:3001
echo.
echo Access from any device on your network (192.168.3.x)
echo.
start http://localhost:3000
echo.
pause
goto :eof

:internet
echo.
echo Starting AUTOMATIC internet access setup...
echo.
call start-internet-access-simple.bat
goto :eof

:stop
echo.
echo Stopping all services...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM ngrok.exe 2>nul
echo.
echo All services stopped.
echo.
pause
goto :eof

:exit
echo.
echo Goodbye!
timeout /t 2 /nobreak >nul
exit

