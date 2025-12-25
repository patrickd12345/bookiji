# Login to Vercel using a token
# Get your token from: https://vercel.com/account/tokens

Write-Host "To use a token:" -ForegroundColor Cyan
Write-Host "1. Go to: https://vercel.com/account/tokens" -ForegroundColor Yellow
Write-Host "2. Create a new token (or use existing)" -ForegroundColor Yellow
Write-Host "3. Copy the token" -ForegroundColor Yellow
Write-Host ""
$token = Read-Host "Paste your Vercel token here"

if ($token) {
    vercel login --token $token
    Write-Host "`nVerifying login..." -ForegroundColor Cyan
    vercel whoami
} else {
    Write-Host "No token provided. Exiting." -ForegroundColor Red
}

