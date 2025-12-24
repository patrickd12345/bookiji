# Apply pending Supabase migrations using Supabase CLI with password from .env.local
# This script reads .env.local and applies migrations via supabase db push

$ErrorActionPreference = "Stop"

# Load .env.local
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.local not found" -ForegroundColor Red
    exit 1
}

# Read DATABASE_URL from .env.local to extract password
$databaseUrl = $null
$dbPassword = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^DATABASE_URL=(.+)$') {
        $databaseUrl = $matches[1].Trim()
        # Extract password from connection string: postgresql://postgres:PASSWORD@host:port/db
        if ($databaseUrl -match 'postgresql://[^:]+:([^@]+)@') {
            $dbPassword = $matches[1]
        }
    }
}

if (-not $databaseUrl) {
    Write-Host "ERROR: DATABASE_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

if (-not $dbPassword) {
    Write-Host "ERROR: Could not extract database password from DATABASE_URL" -ForegroundColor Red
    exit 1
}

Write-Host "Using DATABASE_URL from .env.local" -ForegroundColor Green
Write-Host ""

# Check if supabase CLI is available
$supabasePath = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabasePath) {
    Write-Host "ERROR: supabase CLI not found. Please install it:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "Pushing migrations to remote database..." -ForegroundColor Cyan
Write-Host ""

# Push migrations using Supabase CLI with password
# Set password as environment variable for the command
$env:SUPABASE_DB_PASSWORD = $dbPassword

try {
    # Capture output, filter out warnings
    $output = supabase db push --password $dbPassword --yes --include-all 2>&1
    
    # Filter and display output
    $output | Where-Object { 
        $_ -notmatch 'WARN:' -and 
        $_ -notmatch 'CategoryInfo' -and 
        $_ -notmatch 'FullyQualifiedErrorId'
    } | ForEach-Object { Write-Host $_ }
    
    # Check if we see "Finished supabase db push" which indicates success
    $finished = $output | Select-String -Pattern "Finished supabase db push"
    
    if ($finished) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "SUCCESS: Migrations applied!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        exit 0
    } else {
        # Check exit code
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "SUCCESS: Command completed" -ForegroundColor Green
            exit 0
        } else {
            Write-Host ""
            Write-Host "ERROR: Migration push may have failed" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
}
