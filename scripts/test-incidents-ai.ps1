# Test script for IncidentsAI endpoints (PowerShell)
# Usage: .\scripts\test-incidents-ai.ps1 [base-url]

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "🧪 Testing IncidentsAI System" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# First, seed some test data
Write-Host "📦 Seeding test data..." -ForegroundColor Yellow
& pnpm tsx scripts/test-incidents-api.ts *> $null
Write-Host "✅ Test data seeded" -ForegroundColor Green
Write-Host ""

# Test 1: List all incidents
Write-Host "1️⃣  Testing GET /api/ops/incidents/list" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ops/incidents/list" -Method Get
    if ($response.ok) {
        Write-Host "   ✅ Success" -ForegroundColor Green
        Write-Host "   📊 Found $($response.count) incidents" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get open incidents only
Write-Host "2️⃣  Testing GET /api/ops/incidents/list?openOnly=true" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ops/incidents/list?openOnly=true" -Method Get
    if ($response.ok) {
        Write-Host "   ✅ Success" -ForegroundColor Green
        Write-Host "   📊 Found $($response.count) open incidents" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get triage summary
Write-Host "3️⃣  Testing GET /api/ops/incidents/ai-triage" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ops/incidents/ai-triage" -Method Get
    if ($response.ok) {
        Write-Host "   ✅ Success" -ForegroundColor Green
        $data = $response.data
        Write-Host "   📊 Critical: $($data.criticalCount), High: $($data.highCount)" -ForegroundColor Gray
        Write-Host "   🚨 Immediate actions: $($data.recommendations.immediate.Count)" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: List events
Write-Host "4️⃣  Testing GET /api/ops/events" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ops/events" -Method Get
    if ($response.ok) {
        Write-Host "   ✅ Success" -ForegroundColor Green
        Write-Host "   📊 Found $($response.count) events" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "✨ Testing complete!" -ForegroundColor Green






