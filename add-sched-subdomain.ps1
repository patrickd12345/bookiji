# Add sched.bookiji.com subdomain to Vercel
# Run this script after authenticating with your Vercel account

Write-Host "Step 1: Checking Vercel authentication..." -ForegroundColor Cyan
$whoamiOutput = vercel whoami 2>&1 | Out-String
$whoami = $whoamiOutput.Trim()

if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Please run: vercel login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Logged in as: $whoami" -ForegroundColor Green

# Check if logged in as wrong account
if ($whoami -match "orbitalastro") {
    Write-Host "`n⚠️  WARNING: Logged in as 'orbitalastro' instead of your account!" -ForegroundColor Red
    Write-Host "Please run: vercel logout" -ForegroundColor Yellow
    Write-Host "Then run: vercel login" -ForegroundColor Yellow
    Write-Host "And authenticate with your patrick-duchesneaus-projects account" -ForegroundColor Yellow
    exit 1
}

# Verify it's the correct account (should be patrick-duchesneaus or similar)
if ($whoami -notmatch "patrick|bookiji") {
    Write-Host "`n⚠️  WARNING: Account doesn't match expected pattern!" -ForegroundColor Yellow
    Write-Host "Current account: $whoami" -ForegroundColor Yellow
    Write-Host "Expected: patrick-duchesneaus-projects or similar" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host "`nStep 2: Linking project..." -ForegroundColor Cyan
vercel link

Write-Host "`nStep 3: Adding sched.bookiji.com domain..." -ForegroundColor Cyan
vercel domains add sched.bookiji.com

Write-Host "`nStep 4: Verifying domain was added..." -ForegroundColor Cyan
vercel domains ls

Write-Host "`nStep 5: Getting domain DNS instructions..." -ForegroundColor Cyan
vercel domains inspect sched.bookiji.com

Write-Host "`n✅ Done! Follow the DNS instructions above to complete setup." -ForegroundColor Green

