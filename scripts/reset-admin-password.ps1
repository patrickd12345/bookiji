# Reset Admin Password Script
# Usage: .\scripts\reset-admin-password.ps1

# Load .env.local if it exists
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim() -replace '^["'']|["'']$', ''
            if (-not [Environment]::GetEnvironmentVariable($key)) {
                [Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
    }
}

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL -or $env:SUPABASE_URL
$supabaseServiceKey = $env:SUPABASE_SECRET_KEY

if (-not $supabaseUrl -or -not $supabaseServiceKey) {
    Write-Host "❌ Missing Supabase environment variables" -ForegroundColor Red
    Write-Host "Please ensure .env.local contains:" -ForegroundColor Yellow
    Write-Host "  NEXT_PUBLIC_SUPABASE_URL=..." -ForegroundColor Yellow
    Write-Host "  SUPABASE_SECRET_KEY=..." -ForegroundColor Yellow
    exit 1
}

Write-Host "🔐 Resetting password for patrick_duchesneau_1@hotmail.com..." -ForegroundColor Cyan

# Use Node.js to run the actual reset (since we need @supabase/supabase-js)
$scriptPath = Join-Path $PSScriptRoot "reset-admin-password.mjs"
node $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Password reset complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Password reset failed. Check the error above." -ForegroundColor Red
    exit 1
}

