# Level 5 Autonomous CI/CD Enhancements

This document describes the Level 5 "autonomous" enhancements added to the Bookiji CI/CD system.

## Overview

Level 5 enhancements focus on:
- **CI Self-Healing** - Automatic flaky test quarantine and adaptive test execution
- **Predictive Rollback** - Regression detection with intelligent rollback suggestions
- **Performance Optimization** - Automated insights and recommendations
- **CI Resource Optimization** - Cost and runtime analysis with suggestions
- **Enhanced Watchdog** - Incident lifecycle management with auto-resolution

---

## 1. CI Self-Healing & Flaky Test Quarantine

### Purpose
Automatically detect and quarantine flaky tests, preventing them from blocking CI while maintaining test coverage awareness.

### Components

#### Metadata Store: `ci-history/`
- **`ci-history/tests.json`** - Persistent test execution statistics
- **`ci-history/quarantined-tests.json`** - List of quarantined tests

#### Script: `scripts/update-test-history.ts`
- Called after Playwright test runs
- Parses Playwright JSON report (`playwright-report/results.json`)
- Updates test statistics:
  - Run count
  - Failure count
  - Flaky failure count (fails after recent pass)
  - Average duration (exponential moving average)
  - Last failure/pass timestamps

#### Script: `scripts/quarantine-flaky-tests.ts`
- Reads `ci-history/tests.json`
- Detects flaky tests using criteria:
  - Has failures > 0
  - Flaky failures >= 2
  - Failure rate < 20% (not consistently failing)
- Creates `ci-history/quarantined-tests.json`
- Optionally creates/updates GitHub issue with flaky test list

#### Integration: `.github/workflows/ci-e2e.yml`
- After E2E tests: runs `update-test-history.ts`
- After history update: runs `quarantine-flaky-tests.ts`
- Uploads `ci-history/` as artifact

#### Predictive Test Selection Integration
- `scripts/predict-tests.ts` automatically skips quarantined tests
- Quarantined tests can still be run manually via explicit commands

### Configuration

**No configuration required** - Works automatically after first test run.

**To un-quarantine a test:**
1. Edit `ci-history/tests.json` and reset `flakyFailures` to 0
2. Or delete the test entry from `ci-history/quarantined-tests.json`
3. Or fix the test and let it pass consistently

### Test History Format

```json
{
  "tests/e2e/booking-flow.spec.ts": {
    "runs": 23,
    "failures": 1,
    "flakyFailures": 1,
    "avgDurationMs": 4000,
    "lastFailureAt": "2025-12-07T00:00:00Z",
    "lastPassedAt": "2025-12-06T23:00:00Z",
    "lastRunAt": "2025-12-07T01:00:00Z"
  }
}
```

### Quarantine Format

```json
{
  "tests/e2e/some-flaky.spec.ts": {
    "reason": "flaky",
    "lastUpdated": "2025-12-07T01:00:00Z",
    "stats": {
      "runs": 15,
      "failures": 3,
      "flakyFailures": 2,
      "avgDurationMs": 3500
    }
  }
}
```

---

## 2. Predictive Regression Detection & Rollback

### Purpose
Automatically detect performance and reliability regressions over time and suggest rollback actions.

### Components

#### Script: `scripts/detect-regressions.ts`
- Analyzes last 10-20 CI metrics from `ci-metrics/`
- Compares current vs baseline (median of older runs)
- Detects regressions in:
  - Booking P95 latency (> 30% increase)
  - Error rate (> 5% or 2x baseline)
  - Lighthouse score (> 10% decrease)
  - Test pass rate (> 10% decrease)
- Checks SLO compliance from `slo/slo-summary.json`
- Outputs `regressions/regression-report.json`

#### Script: `scripts/suggest-rollback.ts`
- Reads `regressions/regression-report.json`
- If `status == "degraded"` and `recommendation == "rollback"`:
  - Identifies suspect commits
  - Suggests rollback target (commit before regression)
  - Optionally triggers automatic rollback if `AUTO_ROLLBACK_ENABLED=true`
- Provides CLI guidance for manual rollback

#### Script: `scripts/create-regression-issue.ts`
- Creates or updates GitHub issue for regressions
- Includes metrics delta and suspect commits
- Labels: `regression`, `reliability`

#### Workflow: `.github/workflows/regression-analyzer.yml`
- Triggers: Every 30 minutes (cron), or manual
- Downloads recent CI metrics artifacts
- Runs `detect-regressions.ts`
- Runs `suggest-rollback.ts`
- Creates/updates regression issue if degraded

### Configuration

**Repository Variables:**
- `AUTO_ROLLBACK_ENABLED` - Set to `true` to enable automatic rollback (default: `false`)

**Environment Variables:**
- `AUTO_ROLLBACK_ENABLED=true` - Enable automatic rollback

### Regression Report Format

```json
{
  "status": "degraded",
  "metrics": {
    "bookingP95": {
      "current": 750,
      "baseline": 500,
      "percentChange": 50
    },
    "errorRate": {
      "current": 0.03,
      "baseline": 0.01,
      "percentChange": 200
    }
  },
  "suspectCommits": ["abc1234", "def5678"],
  "recommendation": "rollback",
  "timestamp": "2025-12-07T10:00:00Z"
}
```

### Rollback Process

**Manual:**
```bash
npx tsx scripts/rollback.ts --sha <commit-sha>
```

**Automatic:**
- Set `AUTO_ROLLBACK_ENABLED=true`
- Regression analyzer will trigger rollback automatically
- **Warning:** Use with caution in production

---

## 3. Automatic Performance Optimization Insights

### Purpose
Generate human-friendly performance recommendations from Lighthouse and SLO metrics.

### Components

#### Script: `scripts/analyze-performance-trends.ts`
- Analyzes Lighthouse metrics from `ci-metrics/`
- Analyzes SLO timeseries from `slo/slo-timeseries.json`
- Detects degradations:
  - LCP > 2.5s
  - CLS > 0.1
  - TBT > 300ms
  - Booking P95 latency > 2000ms
- Generates recommendations:
  - Prioritized list of actions
  - Short explanations
  - Optional OpenAI enhancement for refined suggestions
- Outputs:
  - `perf-insights/perf-report.json`
  - `perf-insights/perf-report.md`

#### Script: `scripts/create-performance-issue.ts`
- Creates or updates GitHub issue for high-priority performance issues
- Labels: `performance`, `ci`

#### Workflow: `.github/workflows/perf-insights.yml`
- Triggers: After successful E2E workflow, or manual
- Downloads CI metrics, SLO metrics, Lighthouse results
- Runs `analyze-performance-trends.ts`
- Creates performance issue if high-priority issues detected

### Configuration

**Optional:**
- `OPENAI_API_KEY` - For enhanced AI-generated recommendations

### Performance Report Format

**JSON:**
```json
{
  "timestamp": "2025-12-07T10:00:00Z",
  "recommendations": [
    {
      "page": "Homepage",
      "metric": "Lighthouse Performance",
      "current": 65,
      "target": 90,
      "recommendation": "Performance score below 70. Consider optimizing images...",
      "priority": "high"
    }
  ],
  "summary": {
    "totalIssues": 3,
    "highPriority": 1,
    "mediumPriority": 2,
    "lowPriority": 0
  }
}
```

**Markdown:**
Human-readable report with prioritized recommendations and actionable insights.

---

## 4. Dynamic CI Resource & Cost Optimization

### Purpose
Analyze CI runtime and suggest resource optimizations without automatically changing configurations.

### Components

#### Script: `scripts/optimize-ci-resources.ts`
- Analyzes recent CI metrics (last 30 runs)
- Computes:
  - Median E2E runtime
  - Current shard count (assumed 2)
- Generates suggestions:
  - If runtime < 5min: suggest reducing shards (2 → 1)
  - If runtime > 30min: suggest increasing shards (2 → 4)
  - If runtime optimal: confirm current config
- Outputs `ci-optimizer/suggestions.json`

### Configuration

**No automatic changes** - Suggestions are advisory only.

### Suggestions Format

```json
{
  "suggestedShardCount": 3,
  "currentShardCount": 2,
  "notes": [
    "E2E median runtime is 28min; consider increasing shardCount from 2 → 3",
    "Core CI runtime is low; safe to keep as-is"
  ]
}
```

### Usage

**Review suggestions:**
```bash
cat ci-optimizer/suggestions.json
```

**Apply manually:**
- Review suggestions
- Update `.github/workflows/ci-e2e.yml` matrix if needed
- Test changes in a PR

---

## 5. Enhanced Watchdog & Incident Lifecycle

### Purpose
Improve incident handling with lifecycle tracking, auto-resolution, and better issue management.

### Components

#### Enhanced: `scripts/production-watchdog.ts`
- **Incident Key Generation**: Creates unique key from failed checks
- **Incident Deduplication**: Matches existing issues by problem type
- **Auto-Resolution**: Detects when conditions normalize
- **Lifecycle Management**:
  - Creates issue on degradation
  - Updates issue with new evidence
  - Adds resolution comment when normalized
  - Optionally closes issue if `ALLOW_AUTO_CLOSE_INCIDENTS=true`
  - Adds `resolved` label if auto-close disabled

### Configuration

**Repository Variables:**
- `ALLOW_AUTO_CLOSE_INCIDENTS` - Set to `true` to auto-close resolved incidents (default: `false`)

**Environment Variables:**
- `ALLOW_AUTO_CLOSE_INCIDENTS=true` - Enable auto-close

### Incident Lifecycle

1. **Detection**: Watchdog detects degradation
2. **Creation**: Creates GitHub issue with incident key
3. **Updates**: Appends comments with new evidence
4. **Resolution**: When conditions normalize:
   - Adds resolution comment
   - Adds `resolved` label (or closes if enabled)
5. **Tracking**: Issue remains for post-mortem analysis

### Incident Issue Format

**Title:** `[incident] Production degradation detected`

**Labels:** `incident`, `watchdog`

**Body includes:**
- Timestamp
- Failed checks
- All check results
- Links to CI runs and health endpoint
- Next steps

**Resolution Comment:**
```
## ✅ Incident Auto-Resolved

**Timestamp:** 2025-12-07T10:00:00Z

All health checks are now passing. Conditions have returned to normal.
```

---

## Environment Variables Summary

### Level 5 Controls

| Variable | Purpose | Default | Location |
|----------|---------|---------|----------|
| `AUTO_ROLLBACK_ENABLED` | Enable automatic rollback | `false` | Repo variable |
| `ALLOW_AUTO_CLOSE_INCIDENTS` | Auto-close resolved incidents | `false` | Repo variable |
| `CI_PREDICTIVE_OFF` | Disable predictive test selection | `false` | Env var |
| `OPENAI_API_KEY` | Enhanced AI recommendations | - | Secret |

### Inherited from Previous Levels

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` - Vercel integration
- `SENTRY_API_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` - Sentry integration
- `GITHUB_TOKEN` - Auto-provided by GitHub Actions
- `SLO_TARGET_BOOKING_LATENCY_MS` - SLO target (default: 500)
- `SLO_TARGET_UPTIME` - Uptime target (default: 99.9)

---

## Workflows Summary

### New Workflows

1. **`.github/workflows/regression-analyzer.yml`**
   - Schedule: Every 30 minutes
   - Detects regressions and suggests rollbacks

2. **`.github/workflows/perf-insights.yml`**
   - Trigger: After E2E workflow completion
   - Generates performance insights

### Enhanced Workflows

1. **`.github/workflows/ci-e2e.yml`**
   - Added test history tracking
   - Added flaky test quarantine

2. **`.github/workflows/watchdog.yml`**
   - Enhanced with incident lifecycle (no changes needed, script handles it)

---

## File Structure

```
ci-history/
  ├── tests.json                    # Test execution statistics
  └── quarantined-tests.json        # Quarantined test list

regressions/
  └── regression-report.json        # Regression analysis results

perf-insights/
  ├── perf-report.json              # Performance analysis (JSON)
  └── perf-report.md                # Performance analysis (Markdown)

ci-optimizer/
  └── suggestions.json              # CI resource optimization suggestions
```

---

## Best Practices

### Flaky Test Management

1. **Monitor quarantined tests regularly**
   - Review `ci-history/quarantined-tests.json`
   - Fix or remove flaky tests

2. **Un-quarantine fixed tests**
   - Reset `flakyFailures` in `tests.json`
   - Or delete from `quarantined-tests.json`

3. **Prevent flakiness**
   - Use proper waits in tests
   - Avoid time-dependent assertions
   - Mock external dependencies

### Regression Management

1. **Review regression reports regularly**
   - Check `regressions/regression-report.json`
   - Investigate suspect commits

2. **Use rollback judiciously**
   - Manual rollback recommended for production
   - Auto-rollback only in staging/test environments

3. **Post-mortem analysis**
   - Review regression issues
   - Identify root causes
   - Prevent future regressions

### Performance Optimization

1. **Prioritize high-priority recommendations**
   - Focus on LCP, CLS, TBT improvements
   - Address booking latency issues

2. **Track trends over time**
   - Review `perf-insights/perf-report.md` regularly
   - Monitor SLO compliance

### CI Resource Optimization

1. **Review suggestions periodically**
   - Check `ci-optimizer/suggestions.json`
   - Adjust shard count based on runtime trends

2. **Balance speed vs cost**
   - More shards = faster feedback but higher cost
   - Fewer shards = lower cost but slower feedback

### Incident Management

1. **Respond to incidents promptly**
   - Check watchdog issues
   - Investigate root causes
   - Document resolutions

2. **Use auto-close carefully**
   - Enable only if you trust auto-resolution
   - Keep issues open for post-mortem analysis

---

## Troubleshooting

### Test History Not Updating

**Problem:** `ci-history/tests.json` not being created

**Solution:**
- Ensure Playwright JSON report exists: `playwright-report/results.json`
- Check `update-test-history.ts` runs after tests
- Verify artifact upload in workflow

### Quarantined Tests Not Skipped

**Problem:** Quarantined tests still running

**Solution:**
- Verify `quarantined-tests.json` exists
- Check `predict-tests.ts` loads quarantine list
- Ensure predictive selection is enabled

### Regression Detection Not Working

**Problem:** No regression reports generated

**Solution:**
- Ensure sufficient metrics (need at least 5)
- Check `ci-metrics/` directory has recent files
- Verify `regression-analyzer.yml` workflow runs

### Performance Insights Empty

**Problem:** No performance recommendations

**Solution:**
- Check Lighthouse results exist
- Verify SLO timeseries has data
- Ensure metrics are recent

### Watchdog Not Resolving Incidents

**Problem:** Incidents not auto-resolving

**Solution:**
- Check `ALLOW_AUTO_CLOSE_INCIDENTS` setting
- Verify all checks are passing
- Check GitHub API permissions

---

## See Also

- `docs/LEVEL4_ENHANCEMENTS.md` - Level 4 features
- `docs/LEVEL3_ENHANCEMENTS.md` - Level 3 features
- `docs/SLO_DASHBOARD.md` - SLO dashboard integration
- `docs/CI_PLAYBOOK.md` - Complete CI/CD playbook

---

**Level 5 Status:** ✅ Complete  
**Last Updated:** December 7, 2025
