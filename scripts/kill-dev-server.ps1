# Kill any running Next.js dev server sessions
# Usage: .\scripts\kill-dev-server.ps1

Write-Host "Checking for running Next.js dev servers..." -ForegroundColor Cyan

# Method 1: Kill processes on port 3000
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    $processes = $port3000 | ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } | Where-Object { $_.ProcessName -eq "node" }
    
    if ($processes) {
        Write-Host "Found Node.js processes on port 3000:" -ForegroundColor Yellow
        foreach ($proc in $processes) {
            Write-Host "  - PID $($proc.Id): $($proc.ProcessName) ($($proc.Path))" -ForegroundColor Yellow
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "    [OK] Killed PID $($proc.Id)" -ForegroundColor Green
            } catch {
                $errorMsg = $_.Exception.Message
                Write-Host "    [FAIL] Failed to kill PID $($proc.Id): $errorMsg" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "No Node.js processes found on port 3000" -ForegroundColor Gray
    }
} else {
    Write-Host "Port 3000 is not in use" -ForegroundColor Gray
}

# Method 2: Kill any node processes with "next" in the command line (more aggressive)
Write-Host ""
Write-Host "Checking for Next.js processes by command line..." -ForegroundColor Cyan
$nextProcesses = Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object {
    $_.CommandLine -like "*next*" -or $_.CommandLine -like "*dev*"
}

if ($nextProcesses) {
    Write-Host "Found Next.js-related processes:" -ForegroundColor Yellow
    foreach ($proc in $nextProcesses) {
        $processId = $proc.ProcessId
        $cmdLine = $proc.CommandLine
        Write-Host "  - PID $processId" -ForegroundColor Yellow
        Write-Host "    Command: $($cmdLine.Substring(0, [Math]::Min(80, $cmdLine.Length)))..." -ForegroundColor Gray
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "    [OK] Killed PID $processId" -ForegroundColor Green
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Host "    [FAIL] Failed to kill PID $processId : $errorMsg" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No Next.js-related processes found" -ForegroundColor Gray
}

# Wait a moment for ports to be released
Start-Sleep -Milliseconds 500

# Final check
$stillRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($stillRunning) {
    Write-Host ""
    Write-Host "[WARNING] Port 3000 is still in use" -ForegroundColor Yellow
    Write-Host "You may need to manually kill the process or wait a few seconds" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[OK] Port 3000 is now free" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan

