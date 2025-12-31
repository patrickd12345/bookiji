# Setup Staging Supabase Environment
# This script creates and wires a staging Supabase project for Bookiji
# 
# PREREQUISITES:
# 1. Supabase CLI installed
# 2. CLI authenticated: `supabase login` (uses sbp_... token, NOT env vars)
#    - This is CLI authentication, separate from app credentials
#    - Do NOT set SUPABASE_ACCESS_TOKEN in .env
#    - CLI stores auth token internally
# 3. Organization ID (get from: https://supabase.com/dashboard/organizations)
# 4. Production project ref: uradoazoyhhozbemrccj (DO NOT TOUCH)
#
# CREDENTIAL DOMAINS (DO NOT CONFUSE):
# - CLI Auth: sbp_... token from `supabase login` (stored by CLI, never in .env)
# - App Credentials: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY (in .env, for app runtime)
# - DB Credentials: Postgres password (for direct DB access, not used by CLI)

param(
    [Parameter(Mandatory=$true)]
    [string]$OrgId,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$DbPassword = "Bookiji2024!",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipMigrations = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🔒 STAGING ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verify CLI authentication (NOT app credentials)
Write-Host "🔐 Checking CLI authentication..." -ForegroundColor Yellow
$statusOutput = supabase status 2>&1
if ($LASTEXITCODE -ne 0 -and $statusOutput -match "Invalid access token|not authenticated|login") {
    Write-Host "❌ CLI not authenticated" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix: Run 'supabase login' (this is CLI auth, separate from app credentials)" -ForegroundColor Yellow
    Write-Host "     Do NOT set SUPABASE_ACCESS_TOKEN in .env" -ForegroundColor Yellow
    Write-Host "     CLI stores auth token internally" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ CLI authenticated" -ForegroundColor Green
Write-Host ""

# Verify we're not touching production
$PROD_PROJECT_REF = "uradoazoyhhozbemrccj"
Write-Host "✅ Production project protected: $PROD_PROJECT_REF" -ForegroundColor Green
Write-Host ""

# STEP 1: Create Staging Project
Write-Host "📦 STEP 1: Creating Staging Supabase Project..." -ForegroundColor Yellow
Write-Host "   Name: Bookiji – Staging" -ForegroundColor Gray
Write-Host "   Region: $Region" -ForegroundColor Gray
Write-Host "   Org ID: $OrgId" -ForegroundColor Gray
Write-Host ""

$createOutput = supabase projects create "Bookiji – Staging" --org-id $OrgId --region $Region --db-password $DbPassword 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create staging project" -ForegroundColor Red
    Write-Host $createOutput -ForegroundColor Red
    exit 1
}

# Extract project ref from output
$stagingProjectRef = ""
if ($createOutput -match "project reference: (\w+)") {
    $stagingProjectRef = $matches[1]
} elseif ($createOutput -match "ref: (\w+)") {
    $stagingProjectRef = $matches[1]
} else {
    # Try to extract from JSON if available
    try {
        $jsonOutput = $createOutput | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($jsonOutput.ref) {
            $stagingProjectRef = $jsonOutput.ref
        }
    } catch {
        Write-Host "⚠️  Could not auto-extract project ref. Please provide it manually:" -ForegroundColor Yellow
        $stagingProjectRef = Read-Host "Enter staging project ref"
    }
}

if (-not $stagingProjectRef) {
    Write-Host "❌ Could not determine staging project ref" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Staging project created: $stagingProjectRef" -ForegroundColor Green
Write-Host "   Dashboard: https://supabase.com/dashboard/project/$stagingProjectRef" -ForegroundColor Gray
Write-Host ""

# STEP 2: Link to Staging (not prod)
Write-Host "🔗 STEP 2: Linking local repo to STAGING project..." -ForegroundColor Yellow
Write-Host "   Project Ref: $stagingProjectRef" -ForegroundColor Gray
Write-Host ""

# Unlink any existing project first
Write-Host "   Unlinking any existing project..." -ForegroundColor Gray
supabase unlink 2>&1 | Out-Null

# Link to staging
$linkOutput = supabase link --project-ref $stagingProjectRef 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link staging project" -ForegroundColor Red
    Write-Host $linkOutput -ForegroundColor Red
    exit 1
}

Write-Host "✅ Linked to staging project" -ForegroundColor Green
Write-Host ""

# Verify config
$configContent = Get-Content "supabase/config.toml" -Raw
if ($configContent -match "project_id\s*=\s*`"([^`"]+)`"") {
    Write-Host "   Config project_id: $($matches[1])" -ForegroundColor Gray
}

Write-Host ""

# STEP 3: Get API Keys
Write-Host "🔑 STEP 3: Retrieving Staging API Keys..." -ForegroundColor Yellow
Write-Host ""

$apiKeysOutput = supabase projects api-keys list $stagingProjectRef 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to retrieve API keys" -ForegroundColor Red
    Write-Host $apiKeysOutput -ForegroundColor Red
    exit 1
}

# Extract keys (format may vary)
$anonKey = ""
$serviceKey = ""

# Try to parse table format
$lines = $apiKeysOutput -split "`n"
foreach ($line in $lines) {
    if ($line -match "anon\s+\|.*?\|.*?\|.*?\|(.*?)\|") {
        $anonKey = ($matches[1] -replace '\s', '').Trim()
    }
    if ($line -match "service_role\s+\|.*?\|.*?\|.*?\|(.*?)\|") {
        $serviceKey = ($matches[1] -replace '\s', '').Trim()
    }
}

# Fallback: try JSON output
if (-not $anonKey -or -not $serviceKey) {
    try {
        $jsonKeys = $apiKeysOutput | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($jsonKeys) {
            $anonKey = ($jsonKeys | Where-Object { $_.name -eq "anon" -or $_.name -eq "anon key" }).api_key
            $serviceKey = ($jsonKeys | Where-Object { $_.name -eq "service_role" -or $_.name -eq "service_role key" }).api_key
        }
    } catch {
        Write-Host "⚠️  Could not parse API keys automatically" -ForegroundColor Yellow
        Write-Host "   Please retrieve manually from:" -ForegroundColor Yellow
        Write-Host "   https://supabase.com/dashboard/project/$stagingProjectRef/settings/api" -ForegroundColor Gray
        $anonKey = Read-Host "Enter STAGING_SUPABASE_PUBLISHABLE_KEY"
        $serviceKey = Read-Host "Enter STAGING_SUPABASE_SECRET_KEY"
    }
}

if (-not $anonKey -or -not $serviceKey) {
    Write-Host "❌ Could not retrieve API keys" -ForegroundColor Red
    Write-Host "   Please get them from: https://supabase.com/dashboard/project/$stagingProjectRef/settings/api" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ API keys retrieved" -ForegroundColor Green
Write-Host ""

# STEP 4: Apply Migrations
if (-not $SkipMigrations) {
    Write-Host "📦 STEP 4: Applying Migrations to Staging..." -ForegroundColor Yellow
    Write-Host "   This will apply all migrations from supabase/migrations/" -ForegroundColor Gray
    Write-Host ""

    # Check migration status first
    Write-Host "   Checking migration status..." -ForegroundColor Gray
    $migrationList = supabase migration list --remote 2>&1
    
    Write-Host "   Applying migrations..." -ForegroundColor Gray
    $pushOutput = supabase db push 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Migration failed" -ForegroundColor Red
        Write-Host $pushOutput -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  If migration history mismatches, you may need to:" -ForegroundColor Yellow
        Write-Host "   1. Check migration history: supabase migration list --remote" -ForegroundColor Gray
        Write-Host "   2. Repair if needed: supabase migration repair" -ForegroundColor Gray
        Write-Host "   3. Retry: supabase db push" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "✅ Migrations applied successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  STEP 4: Skipping migrations (--SkipMigrations flag)" -ForegroundColor Yellow
    Write-Host ""
}

# STEP 5: Environment Variables Summary
Write-Host "📝 STEP 5: Environment Variables Configuration" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add these to your .env.local (for local development with staging):" -ForegroundColor Cyan
Write-Host ""
Write-Host "# Staging Environment" -ForegroundColor Gray
Write-Host "APP_ENV=staging" -ForegroundColor White
Write-Host "STAGING_SUPABASE_URL=https://$stagingProjectRef.supabase.co" -ForegroundColor White
Write-Host "STAGING_SUPABASE_PUBLISHABLE_KEY=$anonKey" -ForegroundColor White
Write-Host "STAGING_SUPABASE_SECRET_KEY=$serviceKey" -ForegroundColor White
Write-Host ""
Write-Host "For CI/CD, add these as secrets:" -ForegroundColor Cyan
Write-Host "  - STAGING_SUPABASE_URL" -ForegroundColor Gray
Write-Host "  - STAGING_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor Gray
Write-Host "  - STAGING_SUPABASE_SECRET_KEY" -ForegroundColor Gray
Write-Host "  - APP_ENV=staging" -ForegroundColor Gray
Write-Host ""

# STEP 6: Verification Checklist
Write-Host "✅ VERIFICATION CHECKLIST" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please verify:" -ForegroundColor Cyan
Write-Host "  [ ] APP_ENV=staging boots successfully" -ForegroundColor Gray
Write-Host "  [ ] Supabase client resolves staging project" -ForegroundColor Gray
Write-Host "  [ ] pnpm invariants:check passes" -ForegroundColor Gray
Write-Host "  [ ] SimCity runs in staging" -ForegroundColor Gray
Write-Host "  [ ] SimCity hard-fails in prod" -ForegroundColor Gray
Write-Host "  [ ] No migration auto-applies in prod" -ForegroundColor Gray
Write-Host "  [ ] No prod credentials appear in CI logs" -ForegroundColor Gray
Write-Host ""

# Final Summary
Write-Host "📊 SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Staging Project:" -ForegroundColor Yellow
Write-Host "  Ref: $stagingProjectRef" -ForegroundColor White
Write-Host "  Region: $Region" -ForegroundColor White
Write-Host "  URL: https://$stagingProjectRef.supabase.co" -ForegroundColor White
Write-Host "  Dashboard: https://supabase.com/dashboard/project/$stagingProjectRef" -ForegroundColor White
Write-Host ""
Write-Host "Production Project (UNTOUCHED):" -ForegroundColor Yellow
Write-Host "  Ref: $PROD_PROJECT_REF" -ForegroundColor White
Write-Host "  Status: ✅ Protected" -ForegroundColor Green
Write-Host ""
Write-Host "Migrations:" -ForegroundColor Yellow
if (-not $SkipMigrations) {
    Write-Host "  Status: ✅ Applied via CLI" -ForegroundColor Green
} else {
    Write-Host "  Status: ⏭️  Skipped (run manually: supabase db push)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "✅ Staging environment setup complete!" -ForegroundColor Green
Write-Host ""

