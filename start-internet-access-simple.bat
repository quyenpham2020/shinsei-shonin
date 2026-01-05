@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   Shinsei-Shonin Internet Access Setup
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is required but not found!
    pause
    exit /b 1
)

echo Starting automated setup...
echo.
echo This will:
echo  1. Start ngrok for backend and frontend
echo  2. Auto-update configuration
echo  3. Rebuild frontend
echo  4. Display access URLs
echo.

REM Run PowerShell script
powershell.exe -ExecutionPolicy Bypass -File "start-internet-access.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Setup failed! Check errors above.
    pause
    exit /b 1
)

pause
