@echo off
cls
echo.
echo ========================================
echo   START STABLE BRANCH (PRODUCTION)
echo ========================================
echo.
echo This will start servers on standard ports:
echo   - Backend: port 3001
echo   - Frontend: port 3000
echo.
echo Make sure you're on your stable branch (main/master)!
echo Current branch:
git branch --show-current
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Starting backend on port 3001...
start cmd /k "cd backend && npm start"

timeout /t 3 /nobreak >nul

echo.
echo Starting frontend on port 3000...
start cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   Stable servers started!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo To expose via internet:
echo   ngrok http 3000
echo.
pause
