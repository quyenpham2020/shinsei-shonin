@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo   PUSH CODE TO GITHUB
echo ========================================
echo.

REM Check if there are changes
git status --short >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not a git repository!
    pause
    exit /b 1
)

REM Show current branch
for /f "tokens=*" %%a in ('git branch --show-current') do set CURRENT_BRANCH=%%a
echo Current branch: %CURRENT_BRANCH%
echo.

REM Ask for branch name
echo Options:
echo   1. Push to current branch (%CURRENT_BRANCH%)
echo   2. Create new branch
echo.
set /p CHOICE="Enter your choice (1 or 2): "

if "%CHOICE%"=="1" (
    set BRANCH_NAME=%CURRENT_BRANCH%
) else if "%CHOICE%"=="2" (
    set /p BRANCH_NAME="Enter new branch name (e.g., feature-xyz-20260108): "
    if "!BRANCH_NAME!"=="" (
        echo ERROR: Branch name cannot be empty!
        pause
        exit /b 1
    )
    echo.
    echo Creating new branch: !BRANCH_NAME!
    git checkout -b !BRANCH_NAME!
) else (
    echo ERROR: Invalid choice!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   CHECKING CHANGES
echo ========================================
echo.
git status

echo.
echo ========================================
echo   ADDING FILES
echo ========================================
echo.
echo Adding all changes (excluding binary/temp files)...
git add .

REM Remove binary and temp files from staging
git reset HEAD cloudflared.exe 2>nul
git reset HEAD *.zip 2>nul
git reset HEAD backend/temp-*.js 2>nul
git reset HEAD shinsei-shonin 2>nul

echo.
echo ========================================
echo   COMMIT MESSAGE
echo ========================================
echo.
set /p COMMIT_MSG="Enter commit message (or press Enter for default): "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=chore: Update code
)

echo.
echo Committing with message: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

if errorlevel 1 (
    echo.
    echo No changes to commit or commit failed!
    echo.
    set /p PUSH_ANYWAY="Do you want to push anyway? (y/n): "
    if /i not "!PUSH_ANYWAY!"=="y" (
        echo Push cancelled.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   PUSHING TO GITHUB
echo ========================================
echo.
echo Pushing to origin/%BRANCH_NAME%...
git push -u origin %BRANCH_NAME%

if errorlevel 1 (
    echo.
    echo ========================================
    echo   PUSH FAILED!
    echo ========================================
    echo.
    echo Common issues:
    echo   1. Secret detected - Allow it on GitHub
    echo   2. Network error - Check internet connection
    echo   3. Authentication error - Check credentials
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS!
echo ========================================
echo.
echo Code pushed to: origin/%BRANCH_NAME%
echo.
echo View on GitHub:
echo https://github.com/quyenpham2020/shinsei-shonin/tree/%BRANCH_NAME%
echo.
echo Create Pull Request:
echo https://github.com/quyenpham2020/shinsei-shonin/pull/new/%BRANCH_NAME%
echo.
pause
