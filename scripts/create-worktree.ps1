param(
  [Parameter(Mandatory=$true)]
  [string]$Branch
)

Write-Host "Fetching origin..."
git fetch origin

$exists = git rev-parse --verify --quiet $Branch 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Branch exists locally: $Branch"
} else {
  git checkout -b $Branch
  git push -u origin $Branch
}

$safeBranch = $Branch -replace '/', '-'
$wtDir = Join-Path ".." ("bookiji-" + $safeBranch)

Write-Host "Creating worktree at $wtDir"
git worktree add $wtDir $Branch
Write-Host "Worktree ready: $wtDir"

