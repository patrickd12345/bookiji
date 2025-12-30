# SimCity Chaos Sessions Runner (PowerShell)
# Runs all three observation-only chaos sessions

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "SIMCITY CHAOS SESSIONS — OBSERVATION MODE" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Check if BASE_URL is set, otherwise use default
if (-not $env:BASE_URL) {
    $env:BASE_URL = "http://localhost:3000"
    Write-Host "Using default BASE_URL: $env:BASE_URL" -ForegroundColor Yellow
} else {
    Write-Host "Using BASE_URL: $env:BASE_URL" -ForegroundColor Green
}

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Run the master runner
Write-Host "`nStarting SimCity sessions...`n" -ForegroundColor Cyan

try {
    node chaos/sessions/run-simcity-sessions.mjs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n============================================================" -ForegroundColor Green
        Write-Host "ALL SESSIONS COMPLETE" -ForegroundColor Green
        Write-Host "============================================================`n" -ForegroundColor Green
    } else {
        Write-Host "`n============================================================" -ForegroundColor Red
        Write-Host "SESSIONS FAILED" -ForegroundColor Red
        Write-Host "============================================================`n" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "`nERROR: Failed to run sessions: $_" -ForegroundColor Red
    exit 1
}












