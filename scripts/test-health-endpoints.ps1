# Test script for HealthAI endpoints
# Usage: .\scripts\test-health-endpoints.ps1 [baseUrl]

param(
    [string]$BaseUrl = "http://localhost:3000"
)

$endpoints = @(
    "/api/ops/health",
    "/api/ops/health/db",
    "/api/ops/health/webhooks",
    "/api/ops/health/cache",
    "/api/ops/health/search",
    "/api/ops/health/auth"
)

Write-Host "🔍 Testing HealthAI endpoints..." -ForegroundColor Cyan
Write-Host "📍 Base URL: $BaseUrl`n" -ForegroundColor Gray

$results = @()

foreach ($endpoint in $endpoints) {
    $url = "$BaseUrl$endpoint"
    $name = $endpoint -replace '/api/ops/health', '' -replace '^/', ''
    if ([string]::IsNullOrEmpty($name)) {
        $name = "Overall"
    }
    
    Write-Host "Testing: $name..." -NoNewline
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -ErrorAction Stop
        $latency = ((Get-Date) - $startTime).TotalMilliseconds
        
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        $status = $content.status
        $statusColor = switch ($status) {
            "healthy" { "Green" }
            "degraded" { "Yellow" }
            "unhealthy" { "Red" }
            default { "Gray" }
        }
        
        Write-Host " $status ($statusCode) - ${latency}ms" -ForegroundColor $statusColor
        
        $results += @{
            Endpoint = $name
            Status = $status
            StatusCode = $statusCode
            Latency = [math]::Round($latency, 2)
            HasRecommendations = ($content.recommendations -ne $null -and $content.recommendations.Count -gt 0)
        }
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += @{
            Endpoint = $name
            Status = "unhealthy"
            StatusCode = "N/A"
            Latency = "N/A"
            HasRecommendations = $false
            Error = $_.Exception.Message
        }
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
$healthy = ($results | Where-Object { $_.Status -eq "healthy" }).Count
$degraded = ($results | Where-Object { $_.Status -eq "degraded" }).Count
$unhealthy = ($results | Where-Object { $_.Status -eq "unhealthy" }).Count

Write-Host "   ✅ Healthy: $healthy/$($results.Count)" -ForegroundColor Green
Write-Host "   ⚠️  Degraded: $degraded/$($results.Count)" -ForegroundColor Yellow
Write-Host "   ❌ Unhealthy: $unhealthy/$($results.Count)" -ForegroundColor Red

if ($unhealthy -gt 0) {
    Write-Host "`n🚨 Unhealthy endpoints:" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "unhealthy" } | ForEach-Object {
        Write-Host "   • $($_.Endpoint)" -ForegroundColor Red
        if ($_.Error) {
            Write-Host "     $($_.Error)" -ForegroundColor Gray
        }
    }
}

Write-Host "`n💡 Run 'pnpm healthai' for comprehensive diagnostic analysis" -ForegroundColor Cyan
