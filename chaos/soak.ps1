$n = 1
$logFile = "chaos_soak.log"
Write-Output "SOAK START: $(Get-Date)" | Out-File -FilePath $logFile

while ($true) {
    Write-Host "`n--- Cycle $n | $(Get-Date) ---"
    
    # Step A: Reset substrate
    Write-Host "Step A: Resetting DB..."
    npx supabase db reset > $null
    
    # Wait for PostgREST to be healthy
    $maxRetries = 10
    $retryCount = 0
    $healthy = $false
    while ($retryCount -lt $maxRetries) {
        $check = curl.exe -s -o /dev/null -w "%{http_code}" http://localhost:54321/rest/v1/
        if ($check -match "200|401") {
            $healthy = $true
            break
        }
        $retryCount++
        Start-Sleep -Seconds 2
        Write-Host "Waiting for PostgREST... ($retryCount/$maxRetries)"
    }

    if (-not $healthy) {
        Write-Output "RUN $n | STOP | PostgREST unreachable after reset" | Out-File -Append $logFile
        Write-Host "STOP: PostgREST unreachable after reset" -ForegroundColor Red
        break
    }

    # Step B: Medium soak
    $seedB = Get-Random -Minimum 100000 -Maximum 999999
    Write-Host "Step B: Medium Soak | Seed $seedB..."
    $outB = docker run --rm --network supabase_network_bookiji --env-file chaos/.env.chaos bookiji-chaos --seed $seedB --duration 300 --max-events 3000 --concurrency 12 --target-url http://host.docker.internal:3000
    
    Write-Host "DEBUG: Step B Output: $outB"

    if ($outB -match "PASS") {
        $events = [regex]::Match($outB, "events: (\d+)").Groups[1].Value
        $duration = [regex]::Match($outB, "duration: ([\d.]+)s").Groups[1].Value
        $logLine = "RUN $n | seed=$seedB | duration=$duration | events=$events | result=PASS"
        Write-Output $logLine | Out-File -Append $logFile
        Write-Host "RESULT: PASS" -ForegroundColor Green
    } else {
        $inv = [regex]::Match($outB, "invariant: (\w+)").Groups[1].Value
        $idx = [regex]::Match($outB, "event_index: (-?\d+)").Groups[1].Value
        $logLine = "RUN $n | seed=$seedB | FAIL | invariant=$inv | event_index=$idx"
        Write-Output $logLine | Out-File -Append $logFile
        Write-Host "RESULT: FAIL ($inv)" -ForegroundColor Red
        break
    }

    # Step C: Heavy soak
    $seedC = Get-Random -Minimum 100000 -Maximum 999999
    Write-Host "Step C: Heavy Soak | Seed $seedC..."
    $outC = docker run --rm --network supabase_network_bookiji --env-file chaos/.env.chaos bookiji-chaos --seed $seedC --duration 600 --max-events 6000 --concurrency 12 --target-url http://host.docker.internal:3000
    
    if ($outC -match "PASS") {
        $events = [regex]::Match($outC, "events: (\d+)").Groups[1].Value
        $duration = [regex]::Match($outC, "duration: ([\d.]+)s").Groups[1].Value
        $logLine = "RUN $n | seed=$seedC | duration=$duration | events=$events | result=PASS"
        Write-Output $logLine | Out-File -Append $logFile
        Write-Host "RESULT: PASS" -ForegroundColor Green
    } else {
        $inv = [regex]::Match($outC, "invariant: (\w+)").Groups[1].Value
        $idx = [regex]::Match($outC, "event_index: (-?\d+)").Groups[1].Value
        $logLine = "RUN $n | seed=$seedC | FAIL | invariant=$inv | event_index=$idx"
        Write-Output $logLine | Out-File -Append $logFile
        Write-Host "RESULT: FAIL ($inv)" -ForegroundColor Red
        break
    }

    $n++
}

