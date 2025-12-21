# Restore script that can use full path to psql if not in PATH
# Usage: .\scripts\restore-with-full-path.ps1 -BackupFile "path\to\backup.backup"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [string]$PsqlPath = ""
)

$projectRef = "uradoazoyhhozbemrccj"
$dbPassword = "Bookiji2024!"
$connectionString = "postgresql://postgres.$projectRef`:$dbPassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

Write-Host "🔄 Restoring Supabase backup..." -ForegroundColor Cyan
Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "Target: New Supabase project ($projectRef)" -ForegroundColor Yellow

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Find psql
if ([string]::IsNullOrEmpty($PsqlPath)) {
    $psql = Get-Command psql -ErrorAction SilentlyContinue
    if ($psql) {
        $PsqlPath = $psql.Source
        Write-Host "✅ Found psql in PATH: $PsqlPath" -ForegroundColor Green
    } else {
        # Try common locations
        $commonPaths = @(
            "C:\Program Files\PostgreSQL\18\bin\psql.exe",
            "C:\Program Files\PostgreSQL\17\bin\psql.exe",
            "C:\Program Files\PostgreSQL\16\bin\psql.exe",
            "C:\Program Files\PostgreSQL\15\bin\psql.exe",
            "C:\Program Files (x86)\PostgreSQL\18\bin\psql.exe",
            "C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $PsqlPath = $path
                Write-Host "✅ Found psql at: $PsqlPath" -ForegroundColor Green
                break
            }
        }
        
        if ([string]::IsNullOrEmpty($PsqlPath)) {
            Write-Host "❌ psql not found. Please:" -ForegroundColor Red
            Write-Host "  1. Restart your terminal after PostgreSQL installation" -ForegroundColor Yellow
            Write-Host "  2. Or provide the full path to psql.exe using -PsqlPath parameter" -ForegroundColor Yellow
            Write-Host "  3. Or install PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
            exit 1
        }
    }
}

# Verify psql works
Write-Host "`nChecking psql version..." -ForegroundColor Cyan
& $PsqlPath --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ psql is not working. Please check your PostgreSQL installation." -ForegroundColor Red
    exit 1
}

# Restore the backup
Write-Host "`n🗄️  Starting restore process..." -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

try {
    # Set password as environment variable
    $env:PGPASSWORD = $dbPassword
    
    # Run psql restore
    Write-Host "Running restore command..." -ForegroundColor Gray
    Write-Host "Connection: postgres.$projectRef@aws-0-us-east-1.pooler.supabase.com" -ForegroundColor Gray
    Write-Host ""
    
    & $PsqlPath -d $connectionString -f $BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Backup restored successfully!" -ForegroundColor Green
        Write-Host "🔗 Project URL: https://$projectRef.supabase.co" -ForegroundColor Cyan
        Write-Host "📊 Dashboard: https://supabase.com/dashboard/project/$projectRef" -ForegroundColor Cyan
    } else {
        Write-Host "`n⚠️  Restore completed with exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Some errors are expected (like 'object already exists') - this is normal!" -ForegroundColor Yellow
        Write-Host "Check the output above. If you see 'ERROR' messages, review them." -ForegroundColor Yellow
        Write-Host "If restore seems successful despite errors, verify data in the dashboard." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Error during restore: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Verify data in Supabase dashboard SQL editor" -ForegroundColor White
Write-Host "  2. Run: supabase db push (to apply any pending migrations)" -ForegroundColor White
Write-Host "  3. Update .env.local with new project keys" -ForegroundColor White





