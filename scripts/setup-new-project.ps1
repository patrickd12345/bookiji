# Complete setup script for new Supabase project
# This script prepares everything needed after restoring the backup

param(
    [switch]$SkipBackupRestore = $false
)

Write-Host "🚀 Setting up new Supabase project..." -ForegroundColor Cyan

$projectRef = "uradoazoyhhozbemrccj"
$dbPassword = "Bookiji2024!"

# Set access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_4c001c2987d774293b514d4cd5885c8bee308b58"

Write-Host "`n📋 Project Information:" -ForegroundColor Yellow
Write-Host "  Project Ref: $projectRef"
Write-Host "  Dashboard: https://supabase.com/dashboard/project/$projectRef"
Write-Host "  Database Password: $dbPassword"

# Check if project is linked
Write-Host "`n🔗 Checking project link..." -ForegroundColor Cyan
$linkCheck = supabase link --project-ref $projectRef 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project is linked" -ForegroundColor Green
} else {
    Write-Host "⚠️  Link check completed (may already be linked)" -ForegroundColor Yellow
}

# Get API keys
Write-Host "`n🔑 Retrieving API keys..." -ForegroundColor Cyan
$apiKeys = supabase projects api-keys list $projectRef 2>&1

# Extract keys
$anonKey = ($apiKeys | Select-String -Pattern "anon.*\|" | ForEach-Object { ($_ -split '\|')[2].Trim() } | Select-Object -First 1)
$serviceKey = ($apiKeys | Select-String -Pattern "service_role.*\|" | ForEach-Object { ($_ -split '\|')[2].Trim() } | Select-Object -First 1)
$publishableKey = ($apiKeys | Select-String -Pattern "sb_publishable" | ForEach-Object { ($_ -split '\|')[2].Trim() } | Select-Object -First 1)

Write-Host "✅ API keys retrieved" -ForegroundColor Green

# Get database connection string
Write-Host "`n🗄️  Getting database connection..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $env:SUPABASE_ACCESS_TOKEN"
    "apikey" = $env:SUPABASE_ACCESS_TOKEN
}
$project = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef" -Headers $headers -Method Get
$dbUrl = "postgresql://postgres:${dbPassword}@$($project.database.host):5432/postgres"

Write-Host "✅ Database connection string ready" -ForegroundColor Green

# Display summary
Write-Host "`n📝 Configuration Summary:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_SUPABASE_URL=https://${projectRef}.supabase.co"
Write-Host "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$publishableKey"
Write-Host "  SUPABASE_SERVICE_ROLE_KEY=$serviceKey"
Write-Host "  DATABASE_URL=$dbUrl"

# Check migrations
Write-Host "`n📦 Checking migrations..." -ForegroundColor Cyan
$migrationStatus = supabase db remote commit 2>&1
if ($migrationStatus -match "migration history does not match") {
    Write-Host "⚠️  Migrations need to be applied after backup restore" -ForegroundColor Yellow
    Write-Host "   Run: supabase db push" -ForegroundColor Yellow
} else {
    Write-Host "✅ Migration status checked" -ForegroundColor Green
}

# Next steps
Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
if (-not $SkipBackupRestore) {
    Write-Host "  1. Download backup from: https://supabase.com/dashboard/project/lzgynywojluwdccqkeop" -ForegroundColor White
    Write-Host "  2. Restore backup:" -ForegroundColor White
    Write-Host "     .\scripts\restore-from-backup.ps1 -BackupFile [path] -NewProjectRef $projectRef -DatabasePassword $dbPassword" -ForegroundColor Gray
    Write-Host "  3. Apply migrations:" -ForegroundColor White
    Write-Host "     supabase db push" -ForegroundColor Gray
} else {
    Write-Host "  1. Apply migrations:" -ForegroundColor White
    Write-Host "     supabase db push" -ForegroundColor Gray
    Write-Host "  2. Update .env.local with the keys above" -ForegroundColor White
    Write-Host "  3. Test the connection" -ForegroundColor White
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green














