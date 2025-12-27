# Ensure Required Servers Are Running
# This script checks and starts Supabase and dev server if needed

Write-Host "🔍 Checking required servers..." -ForegroundColor Cyan
Write-Host ""

$allReady = $true

# Check Docker Desktop
Write-Host "Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerRunning) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop first" -ForegroundColor Yellow
    $allReady = $false
} else {
    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
}

# Check Supabase
Write-Host "Checking Supabase..." -ForegroundColor Yellow
$supabaseStatus = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($dockerRunning) {
        Write-Host "⚠️  Supabase is not running. Starting..." -ForegroundColor Yellow
        supabase start
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Supabase started" -ForegroundColor Green
            Start-Sleep -Seconds 5
        } else {
            Write-Host "❌ Failed to start Supabase!" -ForegroundColor Red
            $allReady = $false
        }
    } else {
        Write-Host "❌ Supabase is not running (Docker Desktop required)" -ForegroundColor Red
        $allReady = $false
    }
} else {
    Write-Host "✅ Supabase is running" -ForegroundColor Green
}

# Check dev server
Write-Host "Checking dev server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Dev server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Dev server is not running. Starting..." -ForegroundColor Yellow
    $devServerProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm dev" -WindowStyle Minimized -PassThru
    
    Write-Host "   Waiting for dev server to start (max 60 seconds)..." -ForegroundColor Gray
    $maxWait = 60
    $waited = 0
    $serverReady = $false
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
            $serverReady = $true
            break
        } catch {
            # Still waiting
        }
    }
    
    if ($serverReady) {
        Write-Host "✅ Dev server is ready" -ForegroundColor Green
    } else {
        Write-Host "❌ Dev server failed to start within $maxWait seconds!" -ForegroundColor Red
        Write-Host "   Please start manually: pnpm dev" -ForegroundColor Yellow
        $allReady = $false
    }
}

Write-Host ""
if ($allReady) {
    Write-Host "✅ All servers are running and ready!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some servers are not ready. Please fix issues above." -ForegroundColor Red
    exit 1
}


