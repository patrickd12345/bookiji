# Complete Vercel CLI Audit Script
# This script runs all Vercel CLI commands and saves output to files

$ErrorActionPreference = 'Continue'
$outputDir = "vercel-audit-output"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "=== Vercel CLI Complete Audit ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify project linkage
Write-Host "Step 1: vercel link --yes" -ForegroundColor Yellow
vercel link --yes *> "$outputDir\01-link.txt" 2>&1
Write-Host "Output saved to $outputDir\01-link.txt"
Get-Content "$outputDir\01-link.txt"
Write-Host ""

# Step 2: Pull environment configuration
Write-Host "Step 2: vercel pull --yes" -ForegroundColor Yellow
vercel pull --yes *> "$outputDir\02-pull.txt" 2>&1
Write-Host "Output saved to $outputDir\02-pull.txt"
Get-Content "$outputDir\02-pull.txt"
Write-Host ""

# Step 3: Inspect project metadata
Write-Host "Step 3: vercel inspect" -ForegroundColor Yellow
vercel inspect *> "$outputDir\03-inspect.txt" 2>&1
Write-Host "Output saved to $outputDir\03-inspect.txt"
Get-Content "$outputDir\03-inspect.txt"
Write-Host ""

# Step 4: List deployments
Write-Host "Step 4: vercel list" -ForegroundColor Yellow
vercel list *> "$outputDir\04-list.txt" 2>&1
Write-Host "Output saved to $outputDir\04-list.txt"
Get-Content "$outputDir\04-list.txt"
Write-Host ""

# Step 5: Inspect production deployment
Write-Host "Step 5: vercel inspect --target production" -ForegroundColor Yellow
vercel inspect --target production *> "$outputDir\05-inspect-prod.txt" 2>&1
Write-Host "Output saved to $outputDir\05-inspect-prod.txt"
Get-Content "$outputDir\05-inspect-prod.txt"
Write-Host ""

# Step 6: Print project.json
Write-Host "Step 6: .vercel/project.json" -ForegroundColor Yellow
if (Test-Path .vercel\project.json) {
    Get-Content .vercel\project.json | Out-File "$outputDir\06-project-json.txt"
    Get-Content .vercel\project.json
} else {
    Write-Host ".vercel/project.json does not exist" | Out-File "$outputDir\06-project-json.txt"
    Write-Host ".vercel/project.json does not exist"
}

Write-Host ""
Write-Host "=== Audit Complete ===" -ForegroundColor Green
Write-Host "All output saved to: $outputDir\" -ForegroundColor Cyan



