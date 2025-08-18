# PowerShell script to get test data from Supabase
# This will help us get a real booking ID and customer JWT

$env:SUPABASE_URL = "https://lzgynywojluwdccqkeop.supabase.co"
$env:SUPABASE_SECRET_KEY = "sb_secret_B5AGnE1HJVjoNwwl-Bg4Fw_QWA6Db2w"

Write-Host "🔍 Getting test data from Supabase..." -ForegroundColor Green

# Get bookings from the database
try {
    $headers = @{
        "apikey" = $env:SUPABASE_SECRET_KEY
        "Authorization" = "Bearer $($env:SUPABASE_SECRET_KEY)"
        "Content-Type" = "application/json"
    }
    
    $bookingsUrl = "$($env:SUPABASE_URL)/rest/v1/bookings?select=id,customer_id,status,created_at&limit=5"
    
    Write-Host "📋 Fetching recent bookings..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $bookingsUrl -Headers $headers -Method Get
    
    if ($response) {
        Write-Host "✅ Found bookings:" -ForegroundColor Green
        foreach ($booking in $response) {
            Write-Host "   ID: $($booking.id)" -ForegroundColor Cyan
            Write-Host "   Customer: $($booking.customer_id)" -ForegroundColor Cyan
            Write-Host "   Status: $($booking.status)" -ForegroundColor Cyan
            Write-Host "   Created: $($booking.created_at)" -ForegroundColor Cyan
            Write-Host ""
        }
        
        # Use the first booking as test data
        $firstBooking = $response[0]
        Write-Host "🎯 Using first booking for testing:" -ForegroundColor Green
        Write-Host "   BOOKING_ID=$($firstBooking.id)" -ForegroundColor Yellow
        Write-Host "   CUSTOMER_ID=$($firstBooking.customer_id)" -ForegroundColor Yellow
        
        # Update .env file with real booking ID
        $envContent = Get-Content .env
        $envContent = $envContent -replace "BOOKING_ID=.*", "BOOKING_ID=$($firstBooking.id)"
        $envContent | Set-Content .env
        
        Write-Host "✅ Updated .env file with real booking ID" -ForegroundColor Green
        
    } else {
        Write-Host "❌ No bookings found" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error fetching data: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   This might mean:" -ForegroundColor Yellow
    Write-Host "   1. No bookings exist yet" -ForegroundColor Yellow
    Write-Host "   2. Database permissions need to be set" -ForegroundColor Yellow
    Write-Host "   3. RLS policies are blocking access" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Green
Write-Host "   1. Create a test booking in your app" -ForegroundColor Yellow
Write-Host "   2. Get JWT token from browser dev tools" -ForegroundColor Yellow
Write-Host "   3. Update CUSTOMER_JWT in .env file" -ForegroundColor Yellow
Write-Host "   4. Run: pnpm test:reschedule" -ForegroundColor Yellow
