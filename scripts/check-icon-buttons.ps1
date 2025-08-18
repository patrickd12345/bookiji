# 🛡️ Pre-commit Guard: Check for naked icon buttons (PowerShell version)
# Usage: .\scripts\check-icon-buttons.ps1

Write-Host "🔍 Scanning for icon buttons without aria-label..." -ForegroundColor Blue

# Find icon buttons without aria-label
$nakedButtons = Select-String -Path "src\**\*.tsx", "src\**\*.ts" -Pattern 'size="icon"' | Where-Object { $_.Line -notmatch 'aria-label' -and $_.Line -notmatch 'aria-labelledby' }

if ($nakedButtons.Count -gt 0) 
{
    Write-Host "❌ Found icon buttons without accessible names:" -ForegroundColor Red
    foreach ($button in $nakedButtons) 
    {
        Write-Host "  $($button.Filename):$($button.LineNumber) - $($button.Line.Trim())" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "🔧 Fix by adding aria-label:" -ForegroundColor Cyan
    Write-Host '   <Button size="icon" aria-label="Close dialog">' -ForegroundColor Green
    Write-Host "   OR add screen reader text:" -ForegroundColor Cyan
    Write-Host '   <Button size="icon"><span className="sr-only">Close</span>...</Button>' -ForegroundColor Green
    Write-Host ""
    exit 1
} 
elseif ($nakedButtons.Count -eq 0)
{
    Write-Host "✅ All icon buttons have accessible names!" -ForegroundColor Green
    exit 0
}