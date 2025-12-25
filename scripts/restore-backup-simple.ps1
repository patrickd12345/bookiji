# Simple backup restore script using official Supabase method
# Usage: .\scripts\restore-backup-simple.ps1 -BackupFile "path/to/backup.backup"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [string]$ConnectionString = "postgresql://postgres.uradoazoyhhozbemrccj:Bookiji2024!@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
)

Write-Host "🔄 Restoring Supabase backup..." -ForegroundColor Cyan
Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "Target: New Supabase project (uradoazoyhhozbemrccj)" -ForegroundColor Yellow

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    Write-Host "Please check the file path and try again." -ForegroundColor Yellow
    exit 1
}

# Check if file is gzipped
$isGzipped = $BackupFile -match '\.gz$'
if ($isGzipped) {
    Write-Host "📦 Detected gzipped backup file" -ForegroundColor Yellow
    Write-Host "⚠️  You need to unzip the file first:" -ForegroundColor Yellow
    Write-Host "   Option 1: Use 7-Zip or WinRAR to extract" -ForegroundColor White
    Write-Host "   Option 2: Use PowerShell: Expand-Archive -Path `"$BackupFile`" -DestinationPath `".\`"" -ForegroundColor White
    Write-Host "   The extracted file should have .backup extension" -ForegroundColor White
    exit 1
}

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ psql not found. Please install PostgreSQL:" -ForegroundColor Red
    Write-Host "   Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "   Or use: winget install PostgreSQL.PostgreSQL" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ psql found: $($psqlPath.Source)" -ForegroundColor Green

# Restore the backup
Write-Host "`n🗄️  Starting restore process..." -ForegroundColor Cyan
Write-Host "This may take several minutes depending on backup size..." -ForegroundColor Yellow
Write-Host ""

try {
    # Set password as environment variable to avoid prompt
    $env:PGPASSWORD = "Bookiji2024!"
    
    # Run psql restore
    $restoreCmd = "psql -d `"$ConnectionString`" -f `"$BackupFile`""
    Write-Host "Running: $restoreCmd" -ForegroundColor Gray
    Write-Host ""
    
    Invoke-Expression $restoreCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Backup restored successfully!" -ForegroundColor Green
        Write-Host "🔗 Project URL: https://uradoazoyhhozbemrccj.supabase.co" -ForegroundColor Cyan
        Write-Host "📊 Dashboard: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj" -ForegroundColor Cyan
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "  1. Verify data in Supabase dashboard" -ForegroundColor White
        Write-Host "  2. Run: supabase db push (to apply any pending migrations)" -ForegroundColor White
        Write-Host "  3. Update .env.local with new project keys" -ForegroundColor White
    } else {
        Write-Host "`n⚠️  Restore completed with exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Some errors are expected (like 'object already exists') - this is normal!" -ForegroundColor Yellow
        Write-Host "Check the output above to see if the restore was successful." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error during restore: $_" -ForegroundColor Red
    Write-Host "`nCommon issues:" -ForegroundColor Yellow
    Write-Host "  - Wrong password: Wait a few minutes if you just reset it" -ForegroundColor White
    Write-Host "  - Connection error: Check your internet connection" -ForegroundColor White
    Write-Host "  - File format: Make sure the backup is unzipped (.backup file)" -ForegroundColor White
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
























