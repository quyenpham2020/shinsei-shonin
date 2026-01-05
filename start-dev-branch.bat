@echo off
cls
echo.
echo ========================================
echo   START DEVELOPMENT BRANCH
echo ========================================
echo.
echo This will start servers on different ports:
echo   - Backend: port 3003
echo   - Frontend: port 3002
echo.
echo Make sure you're on your dev branch!
echo Current branch:
git branch --show-current
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Starting backend on port 3003...
start cmd /k "cd backend && set PORT=3003 && set FRONTEND_URL=http://localhost:3002 && npm start"

timeout /t 3 /nobreak >nul

echo.
echo Starting frontend on port 3002...
start cmd /k "cd frontend && set VITE_PORT=3002 && npm run dev -- --port 3002"

echo.
echo ========================================
echo   Development servers started!
echo ========================================
echo.
echo Backend: http://localhost:3003
echo Frontend: http://localhost:3002
echo.
echo Your stable branch continues running on:
echo   - Backend: http://localhost:3001
echo   - Frontend: http://localhost:3000
echo   - Ngrok: (your stable tunnel)
echo.
pause
