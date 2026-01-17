# SimCity Vendor Test Setup Status

## ✅ Completed

1. **Docker Installed**: Docker Engine 29.1.3 is installed
2. **Supabase CLI Installed**: Version 2.67.1 installed at `/usr/local/bin/supabase`
3. **Next.js Server Running**: Server is running on port 3000 with Supabase environment variables configured
4. **Test Script Created**: `/workspace/scripts/run-simcity-vendor-test.sh` is ready to use

## ⚠️ Current Blocker

**Supabase Local Instance**: Cannot start due to Docker storage driver issues in this environment.

The error encountered:
```
failed to convert whiteout file: operation not permitted
```

This is a common issue in containerized/restricted environments where Docker's overlayfs storage driver has permission issues.

## 🔧 Solutions

### Option 1: Use Remote Supabase Instance
If you have a remote Supabase project, update environment variables:
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### Option 2: Fix Docker Storage Driver
Try running Docker with different storage driver or fix permissions:
```bash
sudo dockerd --storage-driver=vfs --iptables=false
```

### Option 3: Use Docker-in-Docker or Different Environment
Run Supabase in an environment with proper Docker support.

## 📋 Once Supabase is Running

1. **Start SimCity Runner**:
   ```bash
   cd /workspace
   pnpm tsx ops/simcity/runner.ts
   ```

2. **Run Vendor Test**:
   ```bash
   ./scripts/run-simcity-vendor-test.sh
   ```

   Or manually via API:
   ```bash
   curl -X POST http://localhost:3000/api/ops/simcity/run \
     -H "Content-Type: application/json" \
     -d '{
       "requested_by": "cursor-agent",
       "tier": "marketplace_bootstrap",
       "duration_seconds": 1800,
       "concurrency": 3,
       "max_events": 10000,
       "seed": 42
     }'
   ```

## 🎯 Test Configuration

- **Tier**: `marketplace_bootstrap` (vendor-focused)
- **Duration**: 1800 seconds (30 minutes)
- **Concurrency**: 3 concurrent operations
- **Max Events**: 10,000 events
- **Seed**: 42 (for deterministic testing)

The test will create vendor registrations via `/api/vendor/register` endpoint, testing the vendor portion of the system.
