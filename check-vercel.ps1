# Check Vercel Configuration
$ErrorActionPreference = 'Continue'

Write-Host "=== Step 1: vercel link ===" -ForegroundColor Cyan
vercel link --yes *> vercel-link-output.txt
Get-Content vercel-link-output.txt
Write-Host ""

Write-Host "=== Step 2: vercel pull ===" -ForegroundColor Cyan
vercel pull --yes *> vercel-pull-output.txt
Get-Content vercel-pull-output.txt
Write-Host ""

Write-Host "=== Step 3: vercel inspect ===" -ForegroundColor Cyan
vercel inspect *> vercel-inspect-output.txt
Get-Content vercel-inspect-output.txt
Write-Host ""

Write-Host "=== Step 4: vercel list ===" -ForegroundColor Cyan
vercel list *> vercel-list-output.txt
Get-Content vercel-list-output.txt
Write-Host ""

Write-Host "=== Step 5: vercel inspect --target production ===" -ForegroundColor Cyan
vercel inspect --target production *> vercel-inspect-prod-output.txt
Get-Content vercel-inspect-prod-output.txt
Write-Host ""

Write-Host "=== Step 6: .vercel/project.json ===" -ForegroundColor Cyan
if (Test-Path .vercel\project.json) {
    Get-Content .vercel\project.json
} else {
    Write-Host ".vercel/project.json does not exist"
}



