# Test SLOAI Endpoints
# Run this script after starting the dev server: npm run dev

$baseUrl = "http://localhost:3000"
$endpoints = @(
    "/api/ops/slo/status",
    "/api/ops/slo/latency?metric=api_booking",
    "/api/ops/slo/errors?metric=api_booking",
    "/api/ops/slo/availability"
)

Write-Host "`n🧪 Testing SLOAI Endpoints`n" -ForegroundColor Cyan

foreach ($endpoint in $endpoints) {
    $url = "$baseUrl$endpoint"
    Write-Host "Testing: $endpoint" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        $json = $response.Content | ConvertFrom-Json
        
        Write-Host "  ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Agent: $($json.agent)" -ForegroundColor Cyan
        Write-Host "  Risk Level: $($json.status.riskLevel)" -ForegroundColor $(
            switch ($json.status.riskLevel) {
                'low' { 'Green' }
                'critical' { 'Red' }
                'high' { 'Yellow' }
                default { 'Yellow' }
            }
        )
        
        if ($json.interpretation) {
            Write-Host "  Summary: $($json.interpretation.summary)" -ForegroundColor White
        }
        
        if ($json.humanAttentionNeeded) {
            Write-Host "  ⚠️  Human attention needed!" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response: $responseBody" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
}

Write-Host "✅ Testing complete!`n" -ForegroundColor Green