$ErrorActionPreference = "SilentlyContinue"
$output = @()

$output += "=== Bookiji Build Check ==="
$output += "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$output += ""

# Check TypeScript
$output += "TypeScript Check..."
$tsResult = & npx tsc --noEmit 2>&1
$output += $tsResult
$output += ""

# Check Next version
$output += "Next.js Version..."
$nextVersion = & npx next --version 2>&1
$output += $nextVersion
$output += ""

# Run build
$output += "Running Build..."
$buildResult = & npm run build 2>&1 | Select-Object -Last 100
$output += $buildResult
$output += ""
$output += "Build check complete at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Write to file
$output | Out-File -FilePath "c:\Users\patri\Projects\bookijibck\BUILD_CHECK.txt" -Encoding UTF8
Write-Host "Check complete. Results written to BUILD_CHECK.txt"

