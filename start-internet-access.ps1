# ========================================
# Automatic Internet Access Setup Script
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Shinsei-Shonin Internet Access Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to kill existing ngrok processes
function Stop-Ngrok {
    Write-Host "[Cleanup] Stopping existing ngrok processes..." -ForegroundColor Yellow
    Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Function to start ngrok in background
function Start-NgrokTunnel {
    param(
        [int]$Port,
        [string]$Name
    )

    Write-Host "[Step] Starting $Name on port $Port..." -ForegroundColor Green
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "ngrok"
    $processInfo.Arguments = "http $Port"
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $process.Start() | Out-Null

    Start-Sleep -Seconds 3
    return $process
}

# Function to get ngrok URL from API
function Get-NgrokUrl {
    param([int]$Port)

    $maxRetries = 10
    $retryCount = 0

    while ($retryCount -lt $maxRetries) {
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get -ErrorAction Stop
            foreach ($tunnel in $response.tunnels) {
                if ($tunnel.config.addr -like "*:$Port") {
                    return $tunnel.public_url
                }
            }
        }
        catch {
            Write-Host "  Waiting for ngrok API... ($retryCount/$maxRetries)" -ForegroundColor Yellow
        }

        Start-Sleep -Seconds 2
        $retryCount++
    }

    return $null
}

# Main Script
try {
    # Step 1: Cleanup
    Stop-Ngrok

    # Step 2: Start Backend Ngrok
    Write-Host ""
    Write-Host "[1/5] Starting Backend Ngrok Tunnel (Port 3001)..." -ForegroundColor Cyan
    $backendProcess = Start-NgrokTunnel -Port 3001 -Name "Backend"

    # Step 3: Get Backend URL
    Write-Host "[2/5] Getting Backend URL..." -ForegroundColor Cyan
    $backendUrl = Get-NgrokUrl -Port 3001

    if (-not $backendUrl) {
        Write-Host "ERROR: Could not get backend URL from ngrok" -ForegroundColor Red
        exit 1
    }

    Write-Host "  Backend URL: $backendUrl" -ForegroundColor Green

    # Step 4: Update frontend/.env
    Write-Host ""
    Write-Host "[3/5] Updating frontend/.env with backend URL..." -ForegroundColor Cyan

    $envPath = "frontend\.env"
    $envContent = @"
# Frontend Environment Variables

# API URL
# Auto-configured by start-internet-access.ps1
VITE_API_URL=$backendUrl

# Backup: For local network access
# VITE_API_URL=http://192.168.3.5:3001
"@

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Host "  .env updated successfully!" -ForegroundColor Green

    # Step 5: Rebuild Frontend
    Write-Host ""
    Write-Host "[4/5] Rebuilding frontend..." -ForegroundColor Cyan
    Push-Location frontend

    $buildOutput = & npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
        Write-Host $buildOutput
        Pop-Location
        exit 1
    }

    Pop-Location
    Write-Host "  Frontend built successfully!" -ForegroundColor Green

    # Step 6: Start Frontend Ngrok
    Write-Host ""
    Write-Host "[5/5] Starting Frontend Ngrok Tunnel (Port 3000)..." -ForegroundColor Cyan

    # Kill backend ngrok and restart both with different API ports
    Stop-Ngrok

    # Start backend ngrok again
    $backendProcess = Start-Job -ScriptBlock {
        & ngrok http 3001 --log=stdout
    }

    Start-Sleep -Seconds 5

    # Get backend URL again
    $backendUrl = Get-NgrokUrl -Port 3001
    Write-Host "  Backend URL: $backendUrl" -ForegroundColor Green

    # Start frontend ngrok
    $frontendProcess = Start-Job -ScriptBlock {
        & ngrok http 3000 --log=stdout
    }

    Start-Sleep -Seconds 5

    # Get frontend URL
    $frontendUrl = $null
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -Method Get
        foreach ($tunnel in $response.tunnels) {
            if ($tunnel.config.addr -like "*:3000") {
                $frontendUrl = $tunnel.public_url
            }
        }
    }
    catch {
        Write-Host "Could not get frontend URL automatically" -ForegroundColor Yellow
    }

    # Display Results
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Setup Complete! Internet Access Ready" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend URL:  " -NoNewline
    Write-Host $backendUrl -ForegroundColor Yellow
    Write-Host ""

    if ($frontendUrl) {
        Write-Host "Frontend URL: " -NoNewline
        Write-Host $frontendUrl -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Access your app from anywhere at:" -ForegroundColor Cyan
        Write-Host $frontendUrl -ForegroundColor Green -BackgroundColor Black
    }
    else {
        Write-Host "Frontend URL: Check ngrok dashboard at http://localhost:4040" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Ngrok Dashboard: http://localhost:4040" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop all tunnels and exit..." -ForegroundColor Yellow
    Write-Host ""

    # Keep script running
    while ($true) {
        Start-Sleep -Seconds 10
    }
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Stop-Ngrok
    exit 1
}
finally {
    # Cleanup on exit
    Write-Host ""
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    Stop-Ngrok
}
