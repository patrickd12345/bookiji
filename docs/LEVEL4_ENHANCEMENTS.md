# Level 4 Autonomous CI/CD Enhancements

This document describes the Level 4 "autonomous" enhancements added to the Bookiji CI/CD system.

> **Note:** For Level 5 "self-healing" enhancements (flaky test quarantine, regression detection, performance insights, CI optimization, enhanced watchdog), see [LEVEL5_ENHANCEMENTS.md](./LEVEL5_ENHANCEMENTS.md).

## Overview

Level 4 enhancements focus on:
- **Predictive, AI-optimized test selection** for intelligent CI execution
- **Full ephemeral environments** per PR beyond just database schemas
- **Traffic shadowing** for canary deployments with automatic analysis
- **SLO/SLA metrics export** and dashboard configuration
- **Immutable deployments** documentation and CI integration
- **Production watchdog** for autonomous incident detection and remediation

---

## 1. Predictive, AI-Optimized Test Selection

### Purpose
Automatically determine which tests to run based on PR changes, reducing CI time and costs while maintaining coverage.

### Components

#### Script: `scripts/predict-tests.ts`
- Analyzes changed files in PR (via `GITHUB_EVENT_PATH` or git diff)
- Maps file paths to features using `tests/config/test-map.json`
- Assesses risk level (low/medium/high) based on change patterns
- Selects relevant tests from mapping
- Determines optimal shard count (1-4)
- Optional OpenAI refinement for enhanced accuracy
- Outputs `ci-plan.json` with test plan

#### Configuration: `tests/config/test-map.json`
Maps features to test files:
```json
{
  "auth": ["tests/e2e/auth.spec.ts"],
  "booking": ["tests/e2e/booking-flow.spec.ts", "tests/e2e/booking-reschedule.spec.ts"],
  "payments": ["tests/e2e/payment-errors.spec.ts"],
  ...
}
```

#### Integration: `.github/workflows/ci-e2e.yml`
- Runs `predict-tests.ts` before E2E tests (PRs only)
- Reads `ci-plan.json` to get `TEST_GLOB` and `SHARD_COUNT`
- Runs only selected tests if plan exists
- Falls back to all tests if plan missing or disabled

### Configuration

**Environment Variables:**
- `CI_PREDICTIVE_OFF=true` - Disable predictive selection (run all tests)
- `OPENAI_API_KEY` - Optional, for AI refinement
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions

**Risk Assessment:**
- **Low**: Only docs/config files → 1 shard, minimal tests
- **Medium**: Regular code changes → 2 shards, feature-specific tests
- **High**: Core logic, payments, auth, migrations → 4 shards, comprehensive tests

### Usage

Automatic on PRs. To disable:
```yaml
env:
  CI_PREDICTIVE_OFF: 'true'
```

**Example Output (`ci-plan.json`):**
```json
{
  "risk": "medium",
  "tests": ["tests/e2e/booking-flow.spec.ts", "tests/e2e/payment-errors.spec.ts"],
  "shardCount": 2
}
```

### Error Handling
- Missing `test-map.json`: Uses empty mapping, runs all tests
- GitHub API failure: Falls back to git diff
- OpenAI failure: Uses heuristic plan
- Always exits 0 (doesn't block CI)

---

## 2. Full Ephemeral Environments

### Purpose
Create complete logical environments per PR including database schemas, environment identifiers, and base URLs.

### Components

#### Script: `scripts/create-ephemeral-env.ts`
- Reads `APP_ENV` (e.g., `pr_123`)
- Calls `prepare-ephemeral-db.ts` for schema setup
- Generates base URL (e.g., `https://pr-123.bookiji.com`)
- Optional Redis namespace (if Redis configured)
- Writes environment descriptor to `env-descriptors/${APP_ENV}.json`
- Also writes `.ephemeral-env.json` for app consumption

#### Workflow: `.github/workflows/ephemeral-env.yml`
- Triggers: PR opened/synchronized/reopened
- Sets `APP_ENV=pr_{number}`
- Runs `create-ephemeral-env.ts`
- Uploads environment descriptor as artifact

### Environment Descriptor Format

```json
{
  "appEnv": "pr_123",
  "schemaName": "bookiji_pr_123",
  "baseUrl": "https://pr-123.bookiji.com",
  "redisNamespace": "bookiji:pr_123",
  "commitSha": "abc1234",
  "branch": "feature/booking",
  "createdAt": "2025-12-07T10:00:00Z"
}
```

### Usage

Automatic on PRs. Environment is available via:
- `.ephemeral-env.json` file
- `APP_ENV` environment variable
- `env-descriptors/` directory

### Integration with Vercel

Vercel preview deployments automatically handle URL generation. This script provides metadata and database schema isolation.

---

## 3. Traffic Shadowing for Canary

### Purpose
Replay real traffic samples against canary deployment to validate performance and correctness before promotion.

### Components

#### Script: `scripts/traffic-shadow.ts`
- Reads traffic sample from `traffic-samples/booking-sample.json` or `TRAFFIC_LOG_PATH`
- Replays requests against `CANARY_URL`
- Collects metrics:
  - Status code distribution
  - Average and P95 latency
  - Error count and rate
- Outputs `traffic-shadow-results.json`

#### Sample Data: `traffic-samples/booking-sample.json`
JSON array of request objects:
```json
[
  { "method": "GET", "path": "/" },
  { "method": "POST", "path": "/api/bookings/create", "body": {...} }
]
```

#### Workflow: `.github/workflows/canary-shadow.yml`
- Triggers: Manual (`workflow_dispatch`) or after canary deploy
- Gets canary URL from `.canary.json` or env var
- Runs traffic shadowing
- Optionally calls `analyze-canary.ts` with traffic metrics
- Uploads results as artifact

### Configuration

**Environment Variables:**
- `CANARY_URL` - Canary deployment URL
- `TRAFFIC_LOG_PATH` - Optional path to traffic log file

### Output Format

```json
{
  "timestamp": "2025-12-07T10:00:00Z",
  "canaryUrl": "https://canary.bookiji.com",
  "totalRequests": 8,
  "statusCodes": { "200": 7, "500": 1 },
  "latencies": [120, 150, ...],
  "errors": 1,
  "summary": {
    "averageLatency": 135,
    "p95Latency": 250,
    "errorRate": 12.5,
    "successRate": 87.5
  }
}
```

### Integration

Traffic shadow results can be included in canary analysis via `analyze-canary.ts` to make promotion decisions.

---

## 4. SLO/SLA Dashboard Export

### Purpose
Aggregate CI metrics to compute SLO compliance and generate dashboard-ready JSON for monitoring.

### Components

#### Script: `scripts/export-slo.ts`
- Loads recent CI metrics from `ci-metrics/` directory
- Computes:
  - Pass/fail rates
  - P50/P95 latencies for booking flows
  - Synthetic uptime approximation
- Checks compliance against targets:
  - `SLO_TARGET_BOOKING_LATENCY_MS` (default: 500ms)
  - `SLO_TARGET_UPTIME` (default: 99.9%)
- Outputs:
  - `slo/slo-summary.json` - Current compliance status
  - `slo/slo-timeseries.json` - Historical data

#### Workflow: `.github/workflows/slo-dashboard.yml`
- Triggers: Daily at 3 AM UTC, or manual
- Downloads recent CI metrics artifacts
- Runs `export-slo.ts`
- Uploads SLO dashboard as artifact

### Configuration

**Repository Variables:**
- `SLO_TARGET_BOOKING_LATENCY_MS` - Target P95 latency (ms)
- `SLO_TARGET_UPTIME` - Target uptime percentage

### Output Format

**slo-summary.json:**
```json
{
  "timestamp": "2025-12-07T03:00:00Z",
  "period": "50 runs",
  "targets": {
    "bookingLatencyMs": 500,
    "uptime": 99.9
  },
  "metrics": {
    "passRate": 98.5,
    "failRate": 1.5,
    "bookingP95Latency": 450,
    "uptimeApprox": 99.2
  },
  "compliance": {
    "bookingLatency": true,
    "uptime": false,
    "overall": false
  }
}
```

**slo-timeseries.json:**
```json
{
  "timestamp": "2025-12-07T03:00:00Z",
  "runs": [
    {
      "timestamp": "2025-12-07T02:00:00Z",
      "commitSha": "abc1234",
      "passRate": 100,
      "bookingP95Latency": 420,
      "passed": true
    }
  ]
}
```

### Dashboard Integration

See `docs/SLO_DASHBOARD.md` for integration with Grafana, Supabase dashboards, or custom monitoring.

---

## 5. Immutable Deployments

### Purpose
Document and enforce immutable deployment practices where each commit gets a unique, unchangeable deployment.

### Documentation: `docs/IMMUTABLE_DEPLOYS.md`

Covers:
- Vercel's immutable deployment model
- How to roll back by promoting previous deployment
- CI integration with commit SHA and deployment URL tracking
- Deployment metadata export

### CI Integration

**Updated: `.github/workflows/ci-e2e.yml`**
- Creates `deploy-metadata/deploy-{sha}.json` with:
  - Commit SHA
  - Preview/production URLs
  - Creation timestamp
- Uploads as artifact for traceability

**Deploy Metadata Format:**
```json
{
  "sha": "abc1234...",
  "previewUrl": "https://pr-123.bookiji.com",
  "productionUrl": "https://www.bookiji.com",
  "createdAt": "2025-12-07T10:00:00Z"
}
```

### Rollback Process

1. Identify previous deployment SHA from metadata
2. Promote that deployment in Vercel dashboard
3. Or use `scripts/rollback.ts` if configured

---

## 6. Production Watchdog

### Purpose
Autonomous monitoring of production health with automatic incident creation and optional remediation.

### Components

#### Script: `scripts/production-watchdog.ts`
- Checks:
  - Health endpoint (`/api/health`)
  - Booking API (`/api/health/bookings`)
  - Error budget via Sentry (optional)
- Determines status: `ok`, `degraded`, or `down`
- Auto-remediation:
  - Attempts `/api/admin/reload-config` if available
- Incident management:
  - Searches for existing open incident issues
  - Creates new issue if none exists
  - Updates existing issue with new check results
- Outputs `watchdog-result.json`

#### Workflow: `.github/workflows/watchdog.yml`
- Triggers: Every 10 minutes (cron), or manual
- Runs watchdog checks
- Uploads results as artifact
- Creates/updates GitHub issues on failure

### Configuration

**Repository Variables:**
- `WATCHDOG_TARGET_URL` - Production URL (default: `https://www.bookiji.com`)
- `WATCHDOG_HEALTH_ENDPOINT` - Health check endpoint
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project

**Secrets:**
- `SENTRY_API_TOKEN` - Sentry API token (optional)
- `GITHUB_TOKEN` - Auto-provided
- `ADMIN_API_KEY` - For auto-remediation (optional)

### Incident Issue Format

**Title:** `[incident] Production degradation detected`

**Labels:** `incident`, `watchdog`

**Body includes:**
- Timestamp
- Failed checks
- All check results
- Links to CI runs and health endpoint
- Next steps

### Auto-Remediation

Currently supports:
- Config reload via `/api/admin/reload-config`

Extendable for:
- Cache clearing
- Service restarts
- Traffic shifting

### Error Handling
- Sentry API failure: Logs warning, continues
- GitHub API failure: Logs warning, continues
- Always exits 0 (doesn't fail CI)

---

## Summary

Level 4 enhancements provide:

✅ **Intelligent CI** - Run only relevant tests, save time and costs  
✅ **Isolated PR Environments** - Full logical environments per PR  
✅ **Canary Validation** - Traffic shadowing before promotion  
✅ **SLO Monitoring** - Dashboard-ready metrics and compliance tracking  
✅ **Immutable Deploys** - Traceable, rollback-safe deployments  
✅ **Autonomous SRE** - Self-healing production monitoring  

All enhancements are:
- **Non-blocking** - Failures don't break CI
- **Incremental** - Can be enabled/disabled independently
- **Well-documented** - See individual docs for details
- **Production-ready** - Follows existing patterns and best practices

---

## See Also

- `docs/SLO_DASHBOARD.md` - SLO dashboard integration guide
- `docs/IMMUTABLE_DEPLOYS.md` - Immutable deployment practices
- `docs/LEVEL3_ENHANCEMENTS.md` - Level 3 features
- `docs/CI_PLAYBOOK.md` - Complete CI/CD playbook
