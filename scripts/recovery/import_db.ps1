param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath
)

function Fail($Message) {
  Write-Error $Message
  exit 1
}

if ($env:RECOVERY_ENV -ne '1') {
  Fail 'RECOVERY_ENV=1 is required.'
}

if (-not $env:DATABASE_URL_RECOVERY) {
  Fail 'DATABASE_URL_RECOVERY is required.'
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

if ($env:DATABASE_URL_RECOVERY -match 'prod|production') {
  Fail 'DATABASE_URL_RECOVERY looks like production.'
}

if (-not (Test-Path -LiteralPath $DumpPath)) {
  Fail "File not found: $DumpPath"
}

$runId = if ($env:RECOVERY_RUN_ID) { $env:RECOVERY_RUN_ID } else { (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssZ') + '_import-db' }
$logDir = Join-Path (Join-Path (Get-Location) 'recovery-logs') $runId
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'run.log'
Write-Host "Log: $logFile"

$ext = [IO.Path]::GetExtension($DumpPath).TrimStart('.').ToLowerInvariant()
$cmd = $null
$args = @()

if (@('dump','backup') -contains $ext) {
  $cmd = 'pg_restore'
  $args = @('--no-owner', '--no-privileges', '--single-transaction', '--dbname', $env:DATABASE_URL_RECOVERY, $DumpPath)
  if ($env:DISABLE_TRIGGERS -eq '1') {
    $args = @('--no-owner', '--no-privileges', '--disable-triggers', '--single-transaction', '--dbname', $env:DATABASE_URL_RECOVERY, $DumpPath)
  }
} elseif ($ext -eq 'sql') {
  $cmd = 'psql'
  $args = @($env:DATABASE_URL_RECOVERY, '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', $DumpPath)
  if ($env:DISABLE_TRIGGERS -eq '1') {
    Write-Warning 'DISABLE_TRIGGERS=1 is only supported with pg_restore (custom dumps).'
  }
} else {
  Fail 'Unsupported dump extension. Use .sql, .dump, or .backup.'
}

Add-Content -Path $logFile -Value "[command] $cmd $($args -join ' ')"
& $cmd @args 2>&1 | Tee-Object -FilePath $logFile
Write-Host "Done. See logs: $logFile"
