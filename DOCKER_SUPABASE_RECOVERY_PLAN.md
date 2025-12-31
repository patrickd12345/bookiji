# Docker & Supabase Recovery Plan

## Current Situation

**Problem:** Docker daemon is not running, blocking all Supabase operations:
- `supabase status/stop/start/db reset` all fail with 500 errors
- Docker Desktop Linux Engine not reachable
- `com.docker.service` is Stopped
- No `dockerd` process running
- Health checks timeout: `http://localhost:55321/auth/v1/health`

**Impact on Tests:**
- **305 connection errors** - Supabase not accessible
- **41 seed data errors** - Cannot run `pnpm e2e:seed` without Supabase
- All E2E tests failing because database is unavailable

---

## Step-by-Step Recovery

### Step 1: Start Docker Desktop (Requires Admin Rights)

**Option A: Start Docker Desktop Manually**
1. Right-click Docker Desktop icon in system tray
2. Select "Start Docker Desktop"
3. If prompted, allow with admin rights

**Option B: Start Docker Service via PowerShell (Elevated)**
1. Open PowerShell as Administrator:
   - Right-click Start Menu → "Windows PowerShell (Admin)"
   - Or: Win+X → "Windows PowerShell (Admin)"
2. Run:
   ```powershell
   sc start com.docker.service
   ```
3. Verify Docker is running:
   ```powershell
   docker ps
   ```
   Should return container list (or empty if no containers running)

**Option C: Start Docker Desktop via Command Line (Elevated)**
```powershell
# In elevated PowerShell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

---

### Step 2: Verify Docker is Running

```powershell
# Check Docker service status
Get-Service -Name "com.docker.service"

# Check if Docker daemon is accessible
docker version

# Check if containers can be listed
docker ps -a
```

**Expected Output:**
- Service status: `Running`
- `docker version` shows client and server versions
- `docker ps` returns (may be empty, that's OK)

---

### Step 3: Restart Supabase

Once Docker is confirmed running:

```powershell
# Stop any existing Supabase instances
supabase stop

# Wait a few seconds
Start-Sleep -Seconds 5

# Start Supabase
supabase start

# Wait for services to be ready
Start-Sleep -Seconds 10
```

**Expected Output:**
- `supabase stop` completes without errors
- `supabase start` shows all services starting
- Services should show as "healthy" after startup

---

### Step 4: Verify Supabase Health

```powershell
# Check Supabase health endpoint
curl.exe --max-time 10 http://localhost:55321/auth/v1/health

# Check admin API (requires service role key)
$env:SUPABASE_SECRET_KEY = "your-secret-key-here"
curl.exe -H "Authorization: Bearer $env:SUPABASE_SECRET_KEY" http://localhost:55321/auth/v1/admin/users?per_page=1
```

**Expected Output:**
- Health check returns HTTP 200
- Admin users API returns user list (or empty array if no users)

**If health check still fails:**
```powershell
# Check Supabase status
supabase status

# Check Docker containers
docker ps | Select-String "supabase"

# Check logs if needed
supabase logs
```

---

### Step 5: Run E2E Seed Command

Once Supabase is healthy:

```powershell
# Run the seed command
pnpm e2e:seed
```

**Expected Output:**
- Seed command completes successfully
- Creates test vendor user: `e2e-vendor@bookiji.test`
- Creates test vendor profile
- Sets up test data

**Verify seed worked:**
```powershell
# Check if vendor profile exists (using Supabase CLI or API)
# Or run a test to verify
pnpm test:e2e -- tests/e2e/scheduling-proof.spec.ts
```

---

## Quick Recovery Script

Save this as `recover-supabase.ps1` and run as Administrator:

```powershell
# recover-supabase.ps1
# Run as Administrator

Write-Host "=== Docker & Supabase Recovery ===" -ForegroundColor Cyan

# Step 1: Start Docker Service
Write-Host "`n[1/5] Starting Docker service..." -ForegroundColor Yellow
try {
    Start-Service -Name "com.docker.service" -ErrorAction Stop
    Write-Host "✓ Docker service started" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to start Docker service: $_" -ForegroundColor Red
    Write-Host "  Make sure you're running as Administrator" -ForegroundColor Yellow
    exit 1
}

# Wait for Docker to initialize
Write-Host "Waiting for Docker to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 2: Verify Docker
Write-Host "`n[2/5] Verifying Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker not responding" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Docker check failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Stop Supabase
Write-Host "`n[3/5] Stopping Supabase..." -ForegroundColor Yellow
supabase stop 2>&1 | Out-Null
Start-Sleep -Seconds 3

# Step 4: Start Supabase
Write-Host "`n[4/5] Starting Supabase..." -ForegroundColor Yellow
try {
    supabase start
    Write-Host "✓ Supabase started" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase start failed: $_" -ForegroundColor Red
    exit 1
}

# Wait for services
Write-Host "Waiting for Supabase services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 5: Health Check
Write-Host "`n[5/5] Checking Supabase health..." -ForegroundColor Yellow
try {
    $healthResponse = curl.exe --max-time 10 http://localhost:55321/auth/v1/health 2>&1
    if ($healthResponse -match "200" -or $healthResponse -match "OK") {
        Write-Host "✓ Supabase is healthy" -ForegroundColor Green
    } else {
        Write-Host "⚠ Health check returned: $healthResponse" -ForegroundColor Yellow
        Write-Host "  Supabase may still be starting up..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Health check failed, but Supabase may still be starting" -ForegroundColor Yellow
}

Write-Host "`n=== Recovery Complete ===" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: pnpm e2e:seed" -ForegroundColor White
Write-Host "  2. Run: pnpm test:e2e" -ForegroundColor White
```

---

## Troubleshooting

### If Docker Service Won't Start

1. **Check Docker Desktop Installation:**
   ```powershell
   Test-Path "C:\Program Files\Docker\Docker\Docker Desktop.exe"
   ```

2. **Restart Docker Desktop:**
   - Close Docker Desktop completely
   - Restart as Administrator
   - Wait for full startup

3. **Check Windows Services:**
   ```powershell
   Get-Service | Where-Object { $_.Name -like "*docker*" }
   ```

4. **Check for Port Conflicts:**
   ```powershell
   netstat -ano | Select-String ":55321"
   ```

### If Supabase Won't Start

1. **Check Supabase Status:**
   ```powershell
   supabase status
   ```

2. **Check Docker Containers:**
   ```powershell
   docker ps -a | Select-String "supabase"
   ```

3. **View Supabase Logs:**
   ```powershell
   supabase logs
   ```

4. **Reset Supabase (if needed):**
   ```powershell
   supabase stop
   supabase db reset
   supabase start
   ```

### If Health Check Fails

1. **Check if port is in use:**
   ```powershell
   netstat -ano | Select-String ":55321"
   ```

2. **Check Supabase config:**
   ```powershell
   supabase status
   ```

3. **Try different port (if 55321 is blocked):**
   - Check `supabase/config.toml` for port configuration
   - Or use `supabase start --port 54322` (if supported)

---

## Prevention

To avoid this issue in the future:

1. **Auto-start Docker Desktop:**
   - Settings → General → "Start Docker Desktop when you log in"

2. **Check Docker before running tests:**
   ```powershell
   # Add to test scripts
   if (-not (docker ps 2>&1)) {
       Write-Host "Docker is not running. Please start Docker Desktop first."
       exit 1
   }
   ```

3. **Health check script:**
   - Create a pre-test script that verifies Docker and Supabase are running
   - Fail fast with clear error messages

---

## Related Test Errors

Once Docker and Supabase are running, these errors should be resolved:

- ✅ **305 Connection Errors** - Supabase will be accessible
- ✅ **41 Seed Data Errors** - `pnpm e2e:seed` will work
- ✅ **30 Fetch Errors** - API endpoints will respond
- ✅ **76 Timeout Errors** - Tests will run faster with database available

---

## Next Steps After Recovery

1. ✅ Start Docker Desktop (as Administrator)
2. ✅ Run recovery script or manual steps above
3. ✅ Verify Supabase health
4. ✅ Run `pnpm e2e:seed`
5. ✅ Re-run tests: `pnpm test:e2e`
6. ✅ Check if errors are resolved

---

## Notes

- **Elevation Required:** Docker service management requires Administrator privileges
- **Startup Time:** Docker Desktop can take 30-60 seconds to fully start
- **Supabase Startup:** Supabase services need 10-20 seconds after Docker is ready
- **Port 55321:** Default Supabase Auth API port (check config if different)


