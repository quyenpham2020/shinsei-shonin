@echo off
cls
echo.
echo ========================================
echo   AUTOMATIC INTERNET ACCESS SETUP
echo ========================================
echo.
echo This script will:
echo   [1] Start ngrok for backend
echo   [2] Get backend URL automatically
echo   [3] Update frontend configuration
echo   [4] Rebuild frontend
echo   [5] Start ngrok for frontend
echo   [6] Display URLs for internet access
echo.
echo Press any key to start...
pause >nul

echo.
echo Starting automation...
echo.

node auto-setup-internet.js

if errorlevel 1 (
    echo.
    echo ========================================
    echo   ERROR: Setup failed!
    echo ========================================
    echo.
    pause
    exit /b 1
)
