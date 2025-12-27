#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy to Vercel staging and run SimCity chaos sessions against it.

.DESCRIPTION
    This script:
    1. Verifies Vercel authentication
    2. Links project if needed
    3. Deploys a preview (staging) runtime
    4. Verifies deployment is reachable
    5. Runs SimCity chaos sessions against staging
    6. Captures all observations

.NOTES
    Requires Vercel CLI to be installed and authenticated.
    Set VERCEL_TOKEN environment variable to skip interactive login.
#>

$ErrorActionPreference = "Stop"

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  STAGING DEPLOYMENT + SIMCITY CHAOS RUNNER" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# Step 1: Verify Vercel authentication
Write-Host "Step 1: Verifying Vercel authentication..." -ForegroundColor Yellow

# Check for token first
if ($env:VERCEL_TOKEN) {
    Write-Host "   Using VERCEL_TOKEN from environment..." -ForegroundColor Gray
    $whoami = vercel whoami --token $env:VERCEL_TOKEN 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Authenticated with token: $whoami" -ForegroundColor Green
        $useToken = $true
    } else {
        Write-Host "⚠️  Token authentication failed, trying default..." -ForegroundColor Yellow
        $useToken = $false
    }
} else {
    $useToken = $false
}

# Try default authentication
if (-not $useToken) {
    try {
        $whoami = vercel whoami 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n❌ NOT AUTHENTICATED" -ForegroundColor Red
            Write-Host "`nTo authenticate, you have two options:" -ForegroundColor Yellow
            Write-Host "`nOption 1: Interactive Login (opens browser)" -ForegroundColor Cyan
            Write-Host "   Run: vercel login" -ForegroundColor White
            Write-Host "   Then run this script again." -ForegroundColor Gray
            Write-Host "`nOption 2: Use Token" -ForegroundColor Cyan
            Write-Host "   Get token from: https://vercel.com/account/tokens" -ForegroundColor White
            Write-Host "   Then run:" -ForegroundColor White
            Write-Host "   `$env:VERCEL_TOKEN = 'your-token-here'" -ForegroundColor White
            Write-Host "   Then run this script again." -ForegroundColor Gray
            Write-Host ""
            exit 1
        } else {
            Write-Host "✅ Authenticated: $whoami" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Authentication check failed: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Link project if needed
Write-Host "`nStep 2: Checking project link..." -ForegroundColor Yellow
if (-not (Test-Path ".vercel\project.json")) {
    Write-Host "   Project not linked. Linking now..." -ForegroundColor Yellow
    if ($useToken) {
        vercel link --yes --token $env:VERCEL_TOKEN
    } else {
        vercel link --yes
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to link project"
    }
    Write-Host "✅ Project linked" -ForegroundColor Green
} else {
    Write-Host "✅ Project already linked" -ForegroundColor Green
    Get-Content .vercel\project.json | Write-Host
}

# Step 3: Deploy preview (staging)
Write-Host "`nStep 3: Deploying preview (staging) runtime..." -ForegroundColor Yellow
Write-Host "   This will create a preview deployment (NOT production)..." -ForegroundColor Gray

if ($useToken) {
    $deployOutput = vercel deploy --yes --token $env:VERCEL_TOKEN 2>&1 | Out-String
} else {
    $deployOutput = vercel deploy --yes 2>&1 | Out-String
}

# Extract deployment URL from output
$urlMatch = $deployOutput | Select-String -Pattern "https://[^\s]+\.vercel\.app"
if ($urlMatch) {
    $STAGING_DEPLOYMENT_URL = $urlMatch.Matches[0].Value
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "   URL: $STAGING_DEPLOYMENT_URL" -ForegroundColor Cyan
} else {
    Write-Host "❌ Could not extract deployment URL from output:" -ForegroundColor Red
    Write-Host $deployOutput -ForegroundColor Red
    throw "Failed to extract deployment URL"
}

# Step 4: Verify deployment is real
Write-Host "`nStep 4: Verifying deployment is reachable..." -ForegroundColor Yellow
Write-Host "   Testing: $STAGING_DEPLOYMENT_URL/api/health" -ForegroundColor Gray

$maxRetries = 5
$retryDelay = 10
$healthCheckPassed = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$STAGING_DEPLOYMENT_URL/api/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            $contentType = $response.Headers['Content-Type']
            if ($contentType -like "*json*") {
                Write-Host "✅ Health check passed! (Attempt $i)" -ForegroundColor Green
                Write-Host "   Response: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))" -ForegroundColor Gray
                $healthCheckPassed = $true
                break
            } else {
                Write-Host "⚠️  Health check returned non-JSON (Attempt $i): $contentType" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "⚠️  Health check failed (Attempt $i/$maxRetries): $_" -ForegroundColor Yellow
        if ($i -lt $maxRetries) {
            Write-Host "   Retrying in $retryDelay seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds $retryDelay
        }
    }
}

if (-not $healthCheckPassed) {
    Write-Host "❌ Health check failed after $maxRetries attempts" -ForegroundColor Red
    Write-Host "   Deployment may not be ready yet. Please verify manually:" -ForegroundColor Yellow
    Write-Host "   curl $STAGING_DEPLOYMENT_URL/api/health" -ForegroundColor Cyan
    exit 1
}

# Step 5: Run SimCity chaos sessions
Write-Host "`nStep 5: Running SimCity chaos sessions against staging..." -ForegroundColor Yellow
Write-Host "   Environment: staging" -ForegroundColor Gray
Write-Host "   Base URL: $STAGING_DEPLOYMENT_URL" -ForegroundColor Gray
Write-Host "   Incident Creation: ENABLED" -ForegroundColor Gray

# Set environment variables
$env:APP_ENV = "staging"
$env:ENABLE_STAGING_INCIDENTS = "true"
$env:BASE_URL = $STAGING_DEPLOYMENT_URL

# Run chaos sessions
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
node chaos/sessions/run-simcity-sessions.mjs
$chaosExitCode = $LASTEXITCODE

Write-Host "`n" + ("="*60) -ForegroundColor Cyan
if ($chaosExitCode -eq 0) {
    Write-Host "✅ SimCity chaos sessions completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  SimCity chaos sessions completed with exit code: $chaosExitCode" -ForegroundColor Yellow
}

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT + CHAOS RUN SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Staging URL: $STAGING_DEPLOYMENT_URL" -ForegroundColor Cyan
Write-Host "Chaos Exit Code: $chaosExitCode" -ForegroundColor $(if ($chaosExitCode -eq 0) { "Green" } else { "Yellow" })
Write-Host "`nObservation files saved in: chaos/sessions/" -ForegroundColor Gray
Write-Host "============================================================`n" -ForegroundColor Cyan

exit $chaosExitCode

