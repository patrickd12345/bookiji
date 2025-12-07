# Test DeployAI Endpoints
# Tests all DeployAI API endpoints

$baseUrl = $args[0]
if (-not $baseUrl) {
    $baseUrl = "http://localhost:3000"
}

Write-Host "🟪 Testing DeployAI Endpoints" -ForegroundColor Magenta
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Gray

$endpoints = @(
    "/api/ops/deploy/status",
    "/api/ops/deploy/canary",
    "/api/ops/deploy/baseline",
    "/api/ops/deploy/recommendation",
    "/api/ops/events/deploy"
)

foreach ($endpoint in $endpoints) {
    $url = "$baseUrl$endpoint"
    Write-Host "Testing: $endpoint" -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            Write-Host "  ✅ Status: $statusCode" -ForegroundColor Green
            $content = $response.Content | ConvertFrom-Json
            Write-Host "  Agent: $($content.agent)" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠️  Status: $statusCode" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "✅ DeployAI endpoint testing complete" -ForegroundColor Green
