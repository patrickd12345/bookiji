# 🟩 HealthAI - System Health Monitoring System

**Guardian of system health and platform integrity.**

## Overview

HealthAI is Bookiji's comprehensive system health monitoring agent that monitors all critical subsystems, detects issues early, and provides diagnostic insights without taking any actions.

## Architecture

### Health Endpoints

All health endpoints are located under `/api/ops/health/`:

1. **`/api/ops/health`** - Main aggregated health endpoint
   - Checks all subsystems in parallel
   - Returns overall system status
   - Provides subsystem-level breakdown

2. **`/api/ops/health/db`** - Database health
   - Connectivity checks
   - Query performance monitoring
   - Connection pool status
   - Latency metrics

3. **`/api/ops/health/webhooks`** - Webhook processing health
   - DLQ (Dead Letter Queue) monitoring
   - Webhook processing status
   - Failure rate tracking
   - Delivery metrics

4. **`/api/ops/health/cache`** - Cache system health
   - Invalidation queue status
   - Cache hit rate monitoring
   - Performance metrics
   - Queue backlog detection

5. **`/api/ops/health/search`** - Search service health
   - Basic search functionality
   - Vector search (pgvector) availability
   - Query latency monitoring
   - Service search checks

6. **`/api/ops/health/auth`** - Authentication health
   - Auth service availability
   - Session management checks
   - OAuth provider configuration
   - Profile access verification

### HealthAI Monitoring Agent

**Location:** `scripts/healthai-monitor.ts`

**Usage:**
```bash
# Monitor local development server
pnpm healthai

# Monitor production
pnpm healthai https://www.bookiji.com

# Monitor staging
pnpm healthai https://staging.bookiji.com
```

**Features:**
- ✅ Monitors all health endpoints in parallel
- ✅ Correlates issues across subsystems
- ✅ Identifies root cause candidates
- ✅ Provides actionable recommendations
- ✅ **NEVER executes actions** - diagnostic only
- ✅ Calm, diagnostic-first output style

## Health Status Levels

### Healthy ✅
- All subsystems operating normally
- No performance degradation
- All checks passing

### Degraded ⚠️
- Some subsystems showing elevated metrics
- Performance issues detected but not critical
- Recommendations provided for improvement

### Unhealthy ❌
- Critical subsystem failures
- Service unavailability
- Immediate attention required

## Correlation Analysis

HealthAI automatically correlates issues across subsystems:

- **Database issues** → Affects Search, Auth, Cache
- **Cache issues** → Affects Search performance
- **Webhook issues** → May indicate downstream service problems
- **Auth issues** → May indicate database or Supabase service problems

## Example Output

```
🔍 HealthAI: Starting comprehensive health monitoring...

📍 Base URL: http://localhost:3000

📊 Health Status Summary:
   ✅ Healthy: 4/6
   ⚠️  Degraded: 1/6
   ❌ Unhealthy: 1/6

🚨 Unhealthy Subsystems:
   • Database
     Error: Connection timeout

⚠️  Degraded Subsystems:
   • Cache
     - Cache invalidation queue elevated: 75 pending
     - Monitor queue processing rate

🔬 HealthAI Diagnostic Report
════════════════════════════════════════════════════════════

🚨 CRITICAL ISSUES DETECTED

Subsystem: Database
Status: UNHEALTHY
Affects: Search, Auth, Cache

Root Cause Candidates:
  1. Database connection pool exhausted
  2. Network connectivity issues
  3. Database server overload
  4. RLS policy misconfiguration
  5. Supabase service degradation

Recommended Next Steps:
  1. Check database connection pool settings
  2. Review slow query logs
  3. Verify Supabase service status
  4. Check network connectivity to database
```

## Testing

### Manual Testing

Test individual endpoints:
```bash
# Main health endpoint
curl http://localhost:3000/api/ops/health

# Database health
curl http://localhost:3000/api/ops/health/db

# Webhook health
curl http://localhost:3000/api/ops/health/webhooks

# Cache health
curl http://localhost:3000/api/ops/health/cache

# Search health
curl http://localhost:3000/api/ops/health/search

# Auth health
curl http://localhost:3000/api/ops/health/auth
```

### PowerShell Test Script

```powershell
.\scripts\test-health-endpoints.ps1
.\scripts\test-health-endpoints.ps1 https://www.bookiji.com
```

### HealthAI Agent

```bash
# Run HealthAI monitor
pnpm healthai

# With custom URL
pnpm healthai https://www.bookiji.com
```

## Integration

### CI/CD Integration

HealthAI can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/health-check.yml
- name: Health Check
  run: pnpm healthai ${{ env.BASE_URL }}
```

### Monitoring Integration

Health endpoints can be monitored by:
- Uptime monitoring services
- APM tools (Sentry, Datadog, etc.)
- Custom monitoring dashboards
- Alerting systems

## Response Format

All health endpoints return JSON with consistent structure:

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-01-16T12:00:00.000Z",
  "checks": {
    "connectivity": { "status": "passed", "latency": 45 },
    "readCapability": { "status": "passed", "latency": 52 }
  },
  "metrics": {
    "maxLatency": 52,
    "avgLatency": 48.5
  },
  "recommendations": [
    "System operating normally"
  ]
}
```

## Design Principles

1. **Diagnostic-First**: Always provide root cause analysis
2. **Non-Intrusive**: Never modify system state
3. **Calm Output**: Clear, structured, actionable information
4. **Correlation**: Identify relationships between subsystem issues
5. **Recommendations**: Suggest next steps, never execute them

## Dependencies

- Next.js API routes
- Supabase client libraries
- DLQ monitoring system
- Cache monitoring system
- TypeScript/tsx for agent script

## Files Created

1. `src/app/api/ops/health/route.ts` - Main health endpoint
2. `src/app/api/ops/health/db/route.ts` - Database health
3. `src/app/api/ops/health/webhooks/route.ts` - Webhook health
4. `src/app/api/ops/health/cache/route.ts` - Cache health
5. `src/app/api/ops/health/search/route.ts` - Search health
6. `src/app/api/ops/health/auth/route.ts` - Auth health
7. `scripts/healthai-monitor.ts` - HealthAI monitoring agent
8. `scripts/test-health-endpoints.ps1` - PowerShell test script

## Next Steps

1. ✅ Health endpoints created
2. ✅ HealthAI monitoring agent implemented
3. ✅ Test scripts provided
4. 🔄 Integrate into CI/CD pipeline (optional)
5. 🔄 Set up automated monitoring (optional)
6. 🔄 Create dashboard visualization (optional)

## Notes

- HealthAI is **read-only** - it never modifies system state
- All recommendations are **suggestions only**
- Endpoints are designed to be lightweight and fast
- Health checks use timeouts to prevent hanging
- Graceful degradation when subsystems are unavailable

---

**Last Updated:** January 16, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete




