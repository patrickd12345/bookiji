# Start Supabase with MailerSend SMTP configuration
$env:GOTRUE_SMTP_HOST = 'smtp.mailersend.net'
$env:GOTRUE_SMTP_PORT = '587'
$env:GOTRUE_SMTP_USER = 'MS_DHvbrC@bookiji.com'
$env:GOTRUE_SMTP_PASS = 'mssp_sLKhPTo.vyyw2lp077l47oqz.k8nsVlT'
$env:GOTRUE_SMTP_ADMIN_EMAIL = 'noreply@bookiji.com'
$env:GOTRUE_SMTP_SENDER_NAME = 'Bookiji'

Write-Host "Starting Supabase with MailerSend SMTP..." -ForegroundColor Green
Write-Host "SMTP Host: $($env:GOTRUE_SMTP_HOST)" -ForegroundColor Gray
Write-Host "SMTP User: $($env:GOTRUE_SMTP_USER)" -ForegroundColor Gray

supabase start
