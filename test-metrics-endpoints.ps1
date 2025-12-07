# Test script for MetricsAI endpoints
$baseUrl = "http://localhost:3000"

Write-Host "Testing MetricsAI endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test System Metrics
Write-Host "1. Testing /api/ops/metrics/system" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ops/metrics/system?timeRange=1h" -Method Get -ErrorAction Stop
    Write-Host "✓ System metrics endpoint working" -ForegroundColor Green
    Write-Host "  Summary: $($response.analysis.summary)" -ForegroundColor Gray
} catch {
    Write-Host "✗ System metrics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test Booking Metrics
Write-Host "2. Testing /api/ops/metrics/bookings" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ops/metrics/bookings?timeRange=1h" -Method Get -ErrorAction Stop
    Write-Host "✓ Booking metrics endpoint working" -ForegroundColor Green
    Write-Host "  Summary: $($response.analysis.summary)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Booking metrics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test P95 Metrics
Write-Host "3. Testing /api/ops/metrics/p95" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ops/metrics/p95?timeRange=1h" -Method Get -ErrorAction Stop
    Write-Host "✓ P95 metrics endpoint working" -ForegroundColor Green
    Write-Host "  Summary: $($response.analysis.summary)" -ForegroundColor Gray
} catch {
    Write-Host "✗ P95 metrics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test Error Metrics
Write-Host "4. Testing /api/ops/metrics/errors" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/ops/metrics/errors?timeRange=1h" -Method Get -ErrorAction Stop
    Write-Host "✓ Error metrics endpoint working" -ForegroundColor Green
    Write-Host "  Summary: $($response.analysis.summary)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Error metrics endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Cyan
