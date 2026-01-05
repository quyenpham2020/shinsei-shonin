@echo off
echo ========================================
echo  Shinsei Shonin - Starting Servers
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server (Port 3001)" cmd /k "cd backend && npm run dev"

timeout /t 2 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server (Port 3000)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  Both servers are starting!
echo ========================================
echo.
echo  Backend:  http://localhost:3001
echo  Frontend: http://localhost:3000
echo.
echo  Press any key to exit this window...
echo  (The servers will keep running)
echo ========================================
pause >nul
