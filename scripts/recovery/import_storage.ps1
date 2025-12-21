param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [string]$Bucket,
  [string]$Prefix,
  [switch]$Apply,
  [switch]$DryRun
)

function Fail($Message) {
  Write-Error $Message
  exit 1
}

if ($env:RECOVERY_ENV -ne '1') {
  Fail 'RECOVERY_ENV=1 is required.'
}

if (-not $env:SUPABASE_PROJECT_REF_RECOVERY) {
  Fail 'SUPABASE_PROJECT_REF_RECOVERY is required.'
}

$allowList = @()
$denyList = @()
if ($env:RECOVERY_ALLOWED_PROJECT_REFS) {
  $allowList = $env:RECOVERY_ALLOWED_PROJECT_REFS.Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ }
}
if ($env:RECOVERY_DENY_PROJECT_REFS) {
  $denyList = $env:RECOVERY_DENY_PROJECT_REFS.Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ }
}

$projectRef = $env:SUPABASE_PROJECT_REF_RECOVERY.ToLowerInvariant()
if ($denyList -contains $projectRef) {
  Fail 'Project ref is explicitly denied.'
}
if ($allowList.Count -gt 0 -and -not ($allowList -contains $projectRef)) {
  Fail 'Project ref is not in RECOVERY_ALLOWED_PROJECT_REFS.'
}

if ($projectRef -match 'prod|production') {
  Fail 'Project ref looks like production.'
}

if (-not (Test-Path -LiteralPath $Path)) {
  Fail "Directory not found: $Path"
}

if (-not $Bucket) {
  $Bucket = $env:STORAGE_BUCKET_RECOVERY
}
if (-not $Bucket) {
  Fail 'STORAGE_BUCKET_RECOVERY (or -Bucket) is required.'
}

$runId = if ($env:RECOVERY_RUN_ID) { $env:RECOVERY_RUN_ID } else { (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssZ') + '_import-storage' }
$logDir = Join-Path (Join-Path (Get-Location) 'recovery-logs') $runId
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'run.log'
Write-Host "Log: $logFile"

$files = Get-ChildItem -Path $Path -File -Recurse
"Files discovered: $($files.Count)" | Tee-Object -FilePath $logFile -Append | Out-Null
$files | ForEach-Object { " - $($_.FullName)" } | Tee-Object -FilePath $logFile -Append | Out-Null

$dest = "sb://$Bucket"
if ($Prefix) {
  $dest = "$dest/$Prefix"
}

$doApply = $Apply.IsPresent -and -not $DryRun.IsPresent
if (-not $doApply) {
  "Dry-run only. Use -Apply to upload." | Tee-Object -FilePath $logFile -Append | Out-Null
  "Would run: supabase storage cp --recursive `"$Path`" `"$dest`"" | Tee-Object -FilePath $logFile -Append | Out-Null
  exit 0
}

$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
  Fail 'supabase CLI not found. Install it or use an S3-compatible tool.'
}

$help = & supabase storage cp --help 2>$null
if ($LASTEXITCODE -ne 0) {
  Fail 'supabase storage cp is not available in this CLI version. Update supabase CLI.'
}

Add-Content -Path $logFile -Value "[command] supabase storage cp --recursive `"$Path`" `"$dest`""
& supabase storage cp --recursive "$Path" "$dest" 2>&1 | Tee-Object -FilePath $logFile
Write-Host "Done. See logs: $logFile"
