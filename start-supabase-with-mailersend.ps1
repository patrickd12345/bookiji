# Start Supabase with MailerSend SMTP configuration
# IMPORTANT: This script reads credentials from environment variables
# Set these before running: GOTRUE_SMTP_USER, GOTRUE_SMTP_PASS
# Never commit credentials to version control!

if (-not $env:GOTRUE_SMTP_USER) {
    Write-Host "❌ Error: GOTRUE_SMTP_USER environment variable not set" -ForegroundColor Red
    Write-Host "Please set GOTRUE_SMTP_USER and GOTRUE_SMTP_PASS before running this script" -ForegroundColor Yellow
    exit 1
}

if (-not $env:GOTRUE_SMTP_PASS) {
    Write-Host "❌ Error: GOTRUE_SMTP_PASS environment variable not set" -ForegroundColor Red
    Write-Host "Please set GOTRUE_SMTP_USER and GOTRUE_SMTP_PASS before running this script" -ForegroundColor Yellow
    exit 1
}

# Set SMTP configuration from environment variables
$env:GOTRUE_SMTP_HOST = if ($env:GOTRUE_SMTP_HOST) { $env:GOTRUE_SMTP_HOST } else { 'smtp.mailersend.net' }
$env:GOTRUE_SMTP_PORT = if ($env:GOTRUE_SMTP_PORT) { $env:GOTRUE_SMTP_PORT } else { '587' }
$env:GOTRUE_SMTP_ADMIN_EMAIL = if ($env:GOTRUE_SMTP_ADMIN_EMAIL) { $env:GOTRUE_SMTP_ADMIN_EMAIL } else { 'noreply@bookiji.com' }
$env:GOTRUE_SMTP_SENDER_NAME = if ($env:GOTRUE_SMTP_SENDER_NAME) { $env:GOTRUE_SMTP_SENDER_NAME } else { 'Bookiji' }

Write-Host "Starting Supabase with MailerSend SMTP..." -ForegroundColor Green
Write-Host "SMTP Host: $($env:GOTRUE_SMTP_HOST)" -ForegroundColor Gray
Write-Host "SMTP User: $($env:GOTRUE_SMTP_USER)" -ForegroundColor Gray
Write-Host "SMTP Port: $($env:GOTRUE_SMTP_PORT)" -ForegroundColor Gray

supabase start
