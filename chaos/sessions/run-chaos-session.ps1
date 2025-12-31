# Chaos Session Runner
# Automatically starts required servers if not running

Write-Host "🔴 DESTRUCTIVE CHAOS SESSION RUNNER" -ForegroundColor Red
Write-Host ""

# Check and start Supabase
Write-Host "Checking Supabase..." -ForegroundColor Yellow
$supabaseStatus = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Supabase is not running. Starting..." -ForegroundColor Yellow
    
    # Check if Docker Desktop is running
    $dockerRunning = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $dockerRunning) {
        Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
        Write-Host "   Please start Docker Desktop first, then run this script again" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
    Write-Host "   Starting Supabase (this may take a minute)..." -ForegroundColor Yellow
    supabase start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start Supabase!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Supabase started" -ForegroundColor Green
    Start-Sleep -Seconds 5  # Give it time to fully start
} else {
    Write-Host "✅ Supabase is running" -ForegroundColor Green
}

# Check and start dev server
Write-Host "Checking dev server..." -ForegroundColor Yellow
$devServerRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
    $devServerRunning = $true
    Write-Host "✅ Dev server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Dev server is not running. Starting..." -ForegroundColor Yellow
    Write-Host "   Starting dev server in background (this may take 30 seconds)..." -ForegroundColor Yellow
    
    # Start dev server in background
    $devServerProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm dev" -WindowStyle Minimized -PassThru
    
    # Wait for server to be ready (max 60 seconds)
    $maxWait = 60
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 2
        $waited += 2
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
            $devServerRunning = $true
            Write-Host "✅ Dev server is ready" -ForegroundColor Green
            break
        } catch {
            Write-Host "   Waiting for dev server... ($waited/$maxWait seconds)" -ForegroundColor Gray
        }
    }
    
    if (-not $devServerRunning) {
        $maxWaitSeconds = $maxWait
        Write-Host "❌ Dev server failed to start within $maxWaitSeconds seconds!" -ForegroundColor Red
        Write-Host "   Please start it manually: pnpm dev" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "✅ All prerequisites met. Starting chaos session..." -ForegroundColor Green
Write-Host ""

# Set environment variables
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_SECRET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Run chaos harness with extreme parameters to actually break things
Write-Host "🔴 EXECUTING CHAOS ATTACKS..." -ForegroundColor Red
Write-Host "   Seed: 999999" -ForegroundColor Yellow
Write-Host "   Duration: 30 seconds" -ForegroundColor Yellow
Write-Host "   Max Events: 1000" -ForegroundColor Yellow
Write-Host "   Concurrency: 100" -ForegroundColor Yellow
Write-Host ""

node chaos/harness/index.mjs `
    --seed 999999 `
    --duration 30 `
    --max-events 1000 `
    --concurrency 100 `
    --target-url http://localhost:3000 `
    --out "chaos/sessions/chaos-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ Chaos session completed (PASS)" -ForegroundColor Green
} else {
    Write-Host "❌ Chaos session completed (FAIL)" -ForegroundColor Red
    Write-Host "   Check output above for invariant violations" -ForegroundColor Yellow
}

exit $exitCode

