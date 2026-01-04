# Apply pending Supabase migrations using Supabase CLI
# This script reads env file based on RUNTIME_MODE and applies migrations via supabase db push
# 
# Usage:
#   For production: $env:RUNTIME_MODE="prod"; $env:ALLOW_PROD_MUTATIONS="true"; .\scripts\apply-pending-migrations.ps1
#   For local/staging: $env:RUNTIME_MODE="dev"; .\scripts\apply-pending-migrations.ps1

$ErrorActionPreference = "Stop"

# Ban .env.local
if (Test-Path ".env.local") {
    Write-Host "ERROR: .env.local is FORBIDDEN. Use .env.dev, .env.e2e, .env.staging, or .env.prod instead." -ForegroundColor Red
    exit 1
}

# Determine runtime mode
$runtimeMode = $env:RUNTIME_MODE
if (-not $runtimeMode) {
    $dotenvPath = $env:DOTENV_CONFIG_PATH
    if ($dotenvPath) {
        if ($dotenvPath -match '\.env\.prod|\.env\.production') { $runtimeMode = "prod" }
        elseif ($dotenvPath -match '\.env\.dev|\.env\.development') { $runtimeMode = "dev" }
        elseif ($dotenvPath -match '\.env\.e2e') { $runtimeMode = "e2e" }
        elseif ($dotenvPath -match '\.env\.staging') { $runtimeMode = "staging" }
    }
}
if (-not $runtimeMode) {
    Write-Host "ERROR: RUNTIME_MODE or DOTENV_CONFIG_PATH must be set" -ForegroundColor Red
    exit 1
}

# Production mutation guard
if ($runtimeMode -eq "prod") {
    if ($env:ALLOW_PROD_MUTATIONS -ne "true") {
        Write-Host "ERROR: Production mutation requires explicit opt-in." -ForegroundColor Red
        Write-Host "Set RUNTIME_MODE=prod ALLOW_PROD_MUTATIONS=true to proceed." -ForegroundColor Yellow
        exit 1
    }
    Write-Host ""
    Write-Host "=== PROD MUTATION MODE ENABLED ===" -ForegroundColor Red
    Write-Host "Applying migrations to production database" -ForegroundColor Red
    Write-Host ""
}

# Load appropriate env file
$envFiles = @{
    "dev" = @(".env.dev", ".env.development")
    "e2e" = @(".env.e2e")
    "staging" = @(".env.staging")
    "prod" = @(".env.prod", ".env.production")
}
$candidates = $envFiles[$runtimeMode]
$envFile = $null
foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
        $envFile = $candidate
        break
    }
}
if (-not $envFile) {
    Write-Host "ERROR: No env file found for mode=$runtimeMode. Tried: $($candidates -join ', ')" -ForegroundColor Red
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
    Write-Host "ERROR: DATABASE_URL not found in $envFile" -ForegroundColor Red
    exit 1
}

if (-not $dbPassword) {
    Write-Host "ERROR: Could not extract database password from DATABASE_URL" -ForegroundColor Red
    exit 1
}

Write-Host "Using DATABASE_URL from $envFile" -ForegroundColor Green
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
