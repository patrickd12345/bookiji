# Script to restore Supabase backup to a new project
# Usage: .\scripts\restore-from-backup.ps1 -BackupFile "path/to/backup.sql" -NewProjectRef "new-project-ref"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    
    [Parameter(Mandatory=$true)]
    [string]$NewProjectRef,
    
    [string]$DatabasePassword = ""
)

Write-Host "🔄 Restoring Supabase backup..." -ForegroundColor Cyan
Write-Host "Backup file: $BackupFile" -ForegroundColor Yellow
Write-Host "Target project: $NewProjectRef" -ForegroundColor Yellow

# Check if backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

# Get database URL for new project
$headers = @{
    "Authorization" = "Bearer $env:SUPABASE_ACCESS_TOKEN"
    "apikey" = $env:SUPABASE_ACCESS_TOKEN
}

try {
    Write-Host "📡 Fetching project details..." -ForegroundColor Cyan
    $project = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$NewProjectRef" -Headers $headers -Method Get
    
    $dbHost = $project.database.host
    $dbUser = "postgres"
    
    if (-not $DatabasePassword) {
        Write-Host "⚠️  Database password required. Please provide --db-password" -ForegroundColor Yellow
        $DatabasePassword = Read-Host "Enter database password" -AsSecureString
        $DatabasePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DatabasePassword)
        )
    }
    
    $dbUrl = "postgresql://${dbUser}:${DatabasePassword}@${dbHost}:5432/postgres"
    
    Write-Host "🗄️  Restoring database..." -ForegroundColor Cyan
    
    # Restore using psql
    $env:PGPASSWORD = $DatabasePassword
    $restoreCmd = "psql `"$dbUrl`" -f `"$BackupFile`""
    
    Invoke-Expression $restoreCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database restored successfully!" -ForegroundColor Green
        Write-Host "🔗 Project URL: https://$NewProjectRef.supabase.co" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Restore failed. Check the error above." -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}











