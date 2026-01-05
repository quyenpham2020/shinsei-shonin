@echo off
cls
echo.
echo ========================================
echo   INTERNET ACCESS - SIMPLE METHOD
echo ========================================
echo.
echo Step 1: Start ngrok manually
echo --------------------------------
echo.
echo Open a NEW command prompt window and run:
echo    ngrok http 3000
echo.
echo Step 2: Get the URL
echo --------------------------------
echo.
echo After ngrok starts, you'll see something like:
echo    Forwarding    https://xxxx-yyyy-zzzz.ngrok-free.app
echo.
echo Step 3: Access from anywhere!
echo --------------------------------
echo.
echo Copy that URL and open it in ANY browser
echo Click "Visit Site" when ngrok shows warning
echo.
echo ========================================
echo.
echo IMPORTANT NOTES:
echo  - Frontend dev server is already running on port 3000
echo  - Backend server is already running on port 3001
echo  - Frontend will automatically proxy to backend
echo  - Just need ngrok tunnel for port 3000!
echo.
echo ========================================
echo.
pause
echo.
echo Opening ngrok for you...
echo.
start cmd /k "echo Starting ngrok for port 3000... && ngrok http 3000"
echo.
echo Ngrok window opened!
echo Look for the "Forwarding" URL and share it!
echo.
