@echo off
echo ========================================
echo  Shinsei Shonin - Stopping Servers
echo ========================================
echo.

echo Stopping Backend Server (Node.js on port 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping Frontend Server (Vite on port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================
echo  All servers stopped!
echo ========================================
echo.
pause
