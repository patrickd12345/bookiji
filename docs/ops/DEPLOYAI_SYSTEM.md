# 🟪 DeployAI - Deployment and Canary Advisor

**Advisor for canaries, rollbacks, and deployment safety.**

## Overview

DeployAI is Bookiji's deployment and canary advisor that interprets canary signals, compares canary vs baseline performance, checks error rates, p95 latency, and SLO alignment. It provides evidence-based recommendations for promotion or rollback, but **NEVER performs the deploy or rollback itself**.

## Architecture

### Database Schema

**Migration**: `20250117000000_deployment_tracking.sql`

Three main tables:
- **`deployments`** - Tracks all deployments (canary, production, staging)
- **`deployment_events`** - Tracks all deployment-related events
- **`deployment_metrics`** - Stores metrics for canary vs baseline comparison

### API Endpoints

All endpoints are located under `/api/ops/deploy/`:

1. **`GET /api/ops/deploy/status`** - Current deployment status
   - Returns active deployments (canary, production, staging)
   - Summary of deployment state

2. **`GET /api/ops/deploy/canary`** - Canary deployment information
   - Detailed canary deployment info
   - Metrics and comparison with baseline
   - SLO alignment status

3. **`GET /api/ops/deploy/baseline`** - Baseline (production) deployment information
   - Current production deployment details
   - Production metrics

4. **`GET /api/ops/deploy/recommendation`** - Deployment recommendation
   - Evidence-based recommendation: promote, rollback, monitor, or extend_canary
   - Risk assessment with metrics
   - Customer impact analysis
   - **NEVER performs actions** - only recommends

5. **`GET /api/ops/events/deploy`** - Deployment events
   - Query parameters: `deployment_id`, `limit`
   - Returns deployment events history

### DeployAI Library

**Location:** `src/lib/observability/deployai.ts`

**Key Methods:**
- `getDeploymentStatus()` - Get current deployment status
- `getCanaryDeployment()` - Get active canary deployment
- `getBaselineDeployment()` - Get active production deployment
- `getDeploymentMetrics()` - Get metrics for a deployment
- `compareCanaryBaseline()` - Compare canary vs baseline performance
- `generateRecommendation()` - Generate evidence-based recommendation
- `getDeploymentEvents()` - Get deployment events

### DeployAI Monitor Script

**Location:** `scripts/deployai-monitor.ts`

**Usage:**
```bash
# Monitor local development server
pnpm deployai

# Monitor production
pnpm deployai https://www.bookiji.com

# Monitor staging
pnpm deployai https://staging.bookiji.com
```

**Features:**
- ✅ Monitors all deployment endpoints
- ✅ Compares canary vs baseline metrics
- ✅ Checks error rates, p95/p99 latency
- ✅ Validates SLO alignment
- ✅ Provides evidence-based recommendations
- ✅ **NEVER executes actions** - advisory only
- ✅ Risk-aware, factual, conservative output style

## Recommendation Logic

DeployAI uses conservative, evidence-driven thresholds:

### Error Rate Thresholds
- **Absolute threshold**: 1% error rate
- **Degradation threshold**: 0.5% worse than baseline
- **Action**: Rollback if exceeded

### Latency Thresholds
- **P95 threshold**: 500ms
- **P99 threshold**: 1000ms
- **Degradation threshold**: 100ms worse than baseline
- **Action**: Rollback if exceeded

### SLO Alignment
- Checks SLO compliance via SLOAI
- Critical violations trigger immediate rollback recommendation
- High violations trigger rollback with medium confidence

### Promotion Criteria
- All metrics within thresholds
- SLO targets met
- Sufficient sample size (≥100 samples)
- No degradation vs baseline

### Sample Size Requirements
- Minimum 100 samples for promotion
- Insufficient samples → extend_canary recommendation

## Output Style

DeployAI follows a **risk-aware, evidence-driven, conservative** style:

- **Never optimistic** - Factual and conservative
- **Evidence-based** - All recommendations include metrics
- **Risk-aware** - Clear risk level assessment
- **Customer impact** - Explains potential user impact
- **Actionable** - Clear reasoning for recommendations

## Example Output

```
🟪 DeployAI: Deployment and Canary Advisor

📍 Base URL: http://localhost:3000

📊 Deployment Status
════════════════════════════════════════════════════════════
   Canary: ✅ Active
   Production: ✅ Active
   Staging: ❌ None
   Active Deployments: 2

   Canary Version: canary-20250117-123456
   Canary Status: active
   Deployed At: 1/17/2025, 12:34:56 PM

🔬 Canary Deployment Analysis
════════════════════════════════════════════════════════════
Version: canary-20250117-123456
Status: active
URL: https://canary.bookiji.com
Deployed: 1/17/2025, 12:34:56 PM

📈 Metrics (Last 15 minutes):
   Error Rate: 0.125%
   P95 Latency: 245ms
   P99 Latency: 380ms
   Throughput: 1250 req/s
   Availability: 99.98%
   Sample Count: 150

📊 Comparison vs Baseline:
   Error Rate: -0.025% ✅
   P95 Latency: -15ms ✅
   P99 Latency: -20ms ✅

   SLO Alignment: ✅ Meets SLO
   SLO Violations: 0

🎯 DeployAI Recommendation
════════════════════════════════════════════════════════════
✅ Recommended Action: PROMOTE
🟢 Risk Level: LOW
📊 Confidence: HIGH

📋 Reasoning:
   1. All metrics within acceptable thresholds
   2. SLO targets met
   3. Sample size sufficient (150 samples)

📈 Metrics:
   Error Rate:
      Canary: 0.125%
      Baseline: 0.150%
      Threshold: 1.00%
   P95 Latency:
      Canary: 245ms
      Baseline: 260ms
      Threshold: 500ms

🎯 SLO Status:
   Canary: ✅ Meets SLO
   Baseline: ✅ Meets SLO

👥 Customer Impact:
   Performance within acceptable limits. No significant customer impact expected.

════════════════════════════════════════════════════════════
⚠️  IMPORTANT: This is a recommendation only.
   DeployAI never performs deployments or rollbacks.
   Human review and approval required for all actions.
```

## Testing

### Manual Testing

Test individual endpoints:
```bash
# Deployment status
curl http://localhost:3000/api/ops/deploy/status

# Canary information
curl http://localhost:3000/api/ops/deploy/canary

# Baseline information
curl http://localhost:3000/api/ops/deploy/baseline

# Recommendation
curl http://localhost:3000/api/ops/deploy/recommendation

# Deployment events
curl http://localhost:3000/api/ops/events/deploy
```

### PowerShell Test Script

```powershell
.\test-deployai-endpoints.ps1
.\test-deployai-endpoints.ps1 https://www.bookiji.com
```

### DeployAI Agent

```bash
# Run DeployAI monitor
pnpm deployai

# With custom URL
pnpm deployai https://www.bookiji.com
```

## Integration

### CI/CD Integration

DeployAI can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/deploy-canary.yml
- name: DeployAI Analysis
  run: pnpm deployai ${{ env.CANARY_URL }}
```

### Deployment Scripts

DeployAI can be called from deployment scripts:

```typescript
// After canary deployment
const recommendation = await fetch('/api/ops/deploy/recommendation')
const { action } = await recommendation.json()

if (action === 'rollback') {
  console.log('⚠️ DeployAI recommends rollback')
  // Human review required
}
```

## Design Principles

1. **Advisory Only**: Never performs deployments or rollbacks
2. **Evidence-Driven**: All recommendations include metrics
3. **Conservative**: Factual, risk-aware, never optimistic
4. **Transparent**: Clear reasoning for all recommendations
5. **Customer-Focused**: Explains customer impact

## Dependencies

- Next.js API routes
- Supabase client libraries
- SLOAI for SLO alignment checks
- TypeScript/tsx for agent script

## Files Created

1. `supabase/migrations/20250117000000_deployment_tracking.sql` - Database schema
2. `src/lib/observability/deployai.ts` - DeployAI library
3. `src/app/api/ops/deploy/status/route.ts` - Status endpoint
4. `src/app/api/ops/deploy/canary/route.ts` - Canary endpoint
5. `src/app/api/ops/deploy/baseline/route.ts` - Baseline endpoint
6. `src/app/api/ops/deploy/recommendation/route.ts` - Recommendation endpoint
7. `src/app/api/ops/events/deploy/route.ts` - Events endpoint
8. `scripts/deployai-monitor.ts` - DeployAI monitoring agent
9. `test-deployai-endpoints.ps1` - PowerShell test script

## Next Steps

1. ✅ Database migration created
2. ✅ DeployAI library implemented
3. ✅ API endpoints created
4. ✅ Monitor script implemented
5. 🔄 Integrate into CI/CD pipeline (optional)
6. 🔄 Set up automated canary analysis (optional)
7. 🔄 Create deployment dashboard (optional)

## Notes

- DeployAI is **read-only** - it never modifies system state
- All recommendations are **suggestions only**
- Human review and approval required for all actions
- Endpoints are designed to be lightweight and fast
- Graceful degradation when deployments are unavailable

---

**Last Updated:** January 23, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete
