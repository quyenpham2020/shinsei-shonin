@echo off
echo ========================================
echo   Starting Ngrok Tunnels for Internet Access
echo ========================================
echo.

echo [1/2] Starting Backend Ngrok (Port 3001)...
start "Ngrok Backend (Port 3001)" cmd /k "ngrok http 3001"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Ngrok (Port 3000)...
start "Ngrok Frontend (Port 3000)" cmd /k "ngrok http 3000"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Ngrok Tunnels Started!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Check the ngrok windows for the URLs:
echo    - Backend URL (port 3001): https://xxxx.ngrok-free.app
echo    - Frontend URL (port 3000): https://yyyy.ngrok-free.app
echo.
echo 2. Update frontend/.env with the BACKEND URL:
echo    VITE_API_URL=https://xxxx.ngrok-free.app
echo.
echo 3. Rebuild frontend:
echo    cd frontend
echo    npm run build
echo.
echo 4. Access from any device via the FRONTEND URL:
echo    https://yyyy.ngrok-free.app
echo.
echo ========================================
echo.
echo Press any key to STOP all ngrok tunnels...
pause >nul

echo.
echo Stopping all ngrok processes...
taskkill /F /IM ngrok.exe >nul 2>&1
echo Done!
timeout /t 2 /nobreak >nul
