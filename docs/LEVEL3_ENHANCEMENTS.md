# Level 3 Enterprise CI/CD Enhancements

This document describes the Level 3 "enterprise" enhancements added to the Bookiji CI/CD system.

> **Note:** For Level 4 "autonomous" enhancements (predictive CI, ephemeral environments, traffic shadowing, SLO dashboard, immutable deploys, production watchdog), see [LEVEL4_ENHANCEMENTS.md](./LEVEL4_ENHANCEMENTS.md).

## Overview

Level 3 enhancements focus on:
- **AI-assisted PR review** for intelligent test suggestions
- **Distributed E2E test execution** for faster feedback
- **Ephemeral environments** for isolated PR testing
- **Auto canary analysis** for data-driven deployment decisions
- **Reliability dashboards** for operational visibility

---

## 1. AI-Assisted PR Review

### Purpose
Automatically analyze PR changes and suggest relevant tests to run, reducing manual review overhead.

### Components

#### Workflow: `.github/workflows/ci-ai.yml`
- **Triggers**: `pull_request` events (opened, synchronize, reopened, edited)
- **Job**: `ai-review`
- **Conditions**: Only runs for non-draft PRs
- **Behavior**: Posts a comment on the PR with risk assessment and test suggestions

#### Script: `scripts/ai-pr-review.mjs`
- Uses OpenAI API (gpt-4o-mini) to analyze PR changes
- Reads PR diff from GitHub API
- Generates:
  - Risk level (low/medium/high)
  - Suggested tests (specific Playwright specs or npm scripts)
  - Areas of concern (payments, auth, migrations, admin)
- Posts "sticky" comment (updates existing comment if present)

### Configuration

**Required Secrets:**
- `OPENAI_API_KEY`: OpenAI API key for analysis

**Environment Variables:**
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
- `GITHUB_REPOSITORY`: Automatically provided
- `GITHUB_EVENT_PATH`: Automatically provided

### Usage

The workflow runs automatically on PR events. No manual intervention required.

**Example Output:**
```
🤖 AI PR Review

🟡 Risk Level: MEDIUM

### Summary
This PR modifies payment processing logic and adds new booking validation.

### Suggested Tests
- npm run e2e
- npx playwright test tests/e2e/booking-flow.spec.ts
- npm run contract

### Areas of Concern
`payments`, `bookings`
```

### Error Handling
- Missing `OPENAI_API_KEY`: Warns and exits 0 (does not block CI)
- OpenAI API failure: Logs error and exits 0
- GitHub API failure: Logs error and exits 0

---

## Predictive CI (Level 4 Preview)

> **Full documentation:** See [LEVEL4_ENHANCEMENTS.md](./LEVEL4_ENHANCEMENTS.md#1-predictive-ai-optimized-test-selection)

Level 4 adds predictive test selection that analyzes PR changes and suggests which tests to run. This is integrated into `ci-e2e.yml`:

**Configuration:**
- Set `CI_PREDICTIVE_OFF=true` to disable
- Uses `tests/config/test-map.json` for feature → test mapping
- Outputs `ci-plan.json` with selected tests and shard count

**Usage:**
Automatic on PRs. The workflow reads `ci-plan.json` and runs only selected tests if available.

---

## 2. E2E Test Sharding

### Purpose
Distribute Playwright tests across multiple shards to reduce total execution time.

### Implementation

#### Updated: `.github/workflows/ci-e2e.yml`

**Matrix Strategy:**
```yaml
matrix:
  browser: [chromium, firefox, webkit]
  shardIndex: [1, 2]
  totalShards: [2]
```

**Test Execution:**
```bash
npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shardIndex }}/${{ matrix.totalShards }}
```

### Configuration

**Shard Count:**
- Default: 2 shards per browser
- To change: Modify `shardIndex` and `totalShards` in matrix
- Example for 4 shards:
  ```yaml
  shardIndex: [1, 2, 3, 4]
  totalShards: [4]
  ```

### How It Works

1. Playwright automatically splits tests across shards
2. Each shard runs a subset of tests
3. Reports are uploaded per shard: `playwright-report-{browser}-shard{index}`
4. All shards must pass for the job to succeed

### Performance Impact

- **Before**: ~15 minutes for full E2E suite
- **After**: ~8 minutes with 2 shards (parallel execution)
- **Scaling**: Linear improvement with more shards (up to reasonable limits)

### Considerations

- Test isolation: Ensure tests don't depend on execution order
- Resource usage: More shards = more parallel runners
- Report aggregation: Each shard produces its own report

---

## 3. Ephemeral Environments Per PR

### Purpose
Create isolated database schemas for PR testing to prevent conflicts and data contamination.

### Implementation

#### Script: `scripts/prepare-ephemeral-db.ts`
- Reads `APP_ENV` environment variable
- For PRs: Creates schema `bookiji_pr_{PR_NUMBER}`
- For main: Uses default schema
- Idempotent: Reuses existing schemas

#### Updated: `.github/workflows/ci-e2e.yml`

**Environment Variables:**
```yaml
env:
  APP_ENV: ${{ github.event_name == 'pull_request' && format('pr_{0}', github.event.number) || 'main' }}
  NEXT_PUBLIC_APP_ENV: ${{ github.event_name == 'pull_request' && format('pr_{0}', github.event.number) || 'main' }}
```

**Step:**
```yaml
- name: Prepare ephemeral DB
  run: npx tsx scripts/prepare-ephemeral-db.ts
```

### Schema Naming

- **PRs**: `bookiji_pr_123` (for PR #123)
- **Main**: Default schema (no prefix)
- **Sanitization**: Invalid characters replaced with underscores

### App Integration

The app should read `APP_ENV` or `NEXT_PUBLIC_APP_ENV` to:
- Select the appropriate schema
- Configure database connections
- Set up test data isolation

**Example:**
```typescript
const schemaName = process.env.APP_ENV?.startsWith('pr_')
  ? `bookiji_${process.env.APP_ENV}`
  : 'public'
```

### Error Handling

- Missing `SUPABASE_DB_URL`: Warns and uses default schema
- Schema creation failure: Logs error and exits 0 (fallback to default)
- Connection issues: Non-blocking warnings

### Benefits

- **Isolation**: Each PR has its own schema
- **No Conflicts**: Multiple PRs can test simultaneously
- **Clean State**: Fresh schema per PR
- **Main Branch Safety**: Main branch uses default schema

---

## 4. Auto Canary Analysis (ACA)

### Purpose
Automatically analyze canary smoke test results and make promotion/rollback decisions based on metrics.

### Implementation

#### Script: `scripts/analyze-canary.ts`
- Parses Playwright test results
- Analyzes metrics:
  - Test pass/fail counts
  - Error rate
  - P95 latency
  - Average latency
- Makes decision: PASSED or FAILED
- Exits with appropriate code

#### Updated: `.github/workflows/ci-e2e.yml`

**In `canary-smoke` job:**
```yaml
- name: Analyze canary results
  if: always()
  run: npx tsx scripts/analyze-canary.ts

- name: Upload canary analysis
  uses: actions/upload-artifact@v4
  with:
    name: canary-analysis
    path: .canary-analysis.json
```

**In `canary-promote` job:**
- Downloads analysis artifact
- Verifies `passed: true`
- Only promotes if analysis passes

**In `canary-rollback` job:**
- Downloads analysis artifact
- Logs failure reason
- Executes rollback

### Thresholds

- **Error Rate**: Max 1% (`MAX_ERROR_RATE = 0.01`)
- **P95 Latency**: Max 2x baseline (`MAX_LATENCY_MULTIPLIER = 2.0`)
- **Baseline P95**: 500ms (`BASELINE_P95_LATENCY = 500`)

### Decision Logic

1. **Any test failures** → FAILED
2. **Error rate > 1%** → FAILED
3. **P95 latency > 1000ms** (2x baseline) → FAILED
4. **Otherwise** → PASSED

### Output

**File**: `.canary-analysis.json`
```json
{
  "passed": true,
  "reason": "Canary passed all checks",
  "metrics": {
    "passed": 10,
    "failed": 0,
    "total": 10,
    "p95Latency": 450,
    "errorRate": 0
  }
}
```

### Integration with Existing Scripts

- **`deploy-canary.ts`**: Deploys canary version
- **`promote-canary.ts`**: Promotes if analysis passes
- **`rollback.ts`**: Rolls back if analysis fails

### Customization

To adjust thresholds, edit `scripts/analyze-canary.ts`:
```typescript
const BASELINE_P95_LATENCY = 500 // ms
const MAX_LATENCY_MULTIPLIER = 2.0
const MAX_ERROR_RATE = 0.01 // 1%
```

---

## 5. Reliability Dashboard Export

### Purpose
Export CI metrics to JSON files for dashboard ingestion (Grafana, Metabase, etc.).

### Implementation

#### Script: `scripts/export-ci-metrics.ts`
- Collects metrics from:
  - Playwright test results
  - Lighthouse reports
  - Load test results (k6)
- Exports to JSON files
- Output directory: `ci-metrics/`

#### Integrated into Workflows

**ci-core.yml:**
- Exports after unit tests and coverage
- Job type: `core`

**ci-e2e.yml:**
- Exports after E2E tests
- Job type: `e2e-{browser}-shard{index}`

**ci-performance.yml:**
- Exports after Lighthouse runs
- Job type: `performance` or `performance-staging`

### Metrics Collected

```typescript
{
  timestamp: string
  commitSha: string
  branch: string
  jobType: string
  metrics: {
    testPassed?: number
    testFailed?: number
    testTotal?: number
    e2eDuration?: number
    lighthouseScore?: number
    lighthousePerformance?: number
    lighthouseAccessibility?: number
    lighthouseBestPractices?: number
    lighthouseSEO?: number
    loadTestP95Latency?: number
    loadTestErrorRate?: number
  }
}
```

### Output Files

- **Location**: `ci-metrics/ci-metrics-{jobType}-{sha}.json`
- **Example**: `ci-metrics/ci-metrics-core-a1b2c3d.json`
- **Retention**: 90 days (uploaded as artifacts)

### Dashboard Integration

**Option 1: Direct File Access**
- Download artifacts from GitHub Actions
- Parse JSON files
- Ingest into dashboard

**Option 2: API Integration**
- Create API endpoint to serve metrics
- Dashboard queries API
- Real-time updates

**Option 3: External Service**
- Push metrics to external service (Datadog, New Relic, etc.)
- Dashboard reads from service

### Error Handling

- Missing test results: Skips those metrics
- Parse errors: Logs warning and continues
- Always exits 0 (does not fail CI)

---

## Configuration Summary

### Required Secrets

| Secret | Purpose | Workflow |
|--------|---------|----------|
| `OPENAI_API_KEY` | AI PR review | ci-ai.yml |
| `GITHUB_TOKEN` | GitHub API access | ci-ai.yml (auto-provided) |
| `VERCEL_TOKEN` | Canary deployment | ci-e2e.yml |
| `CODECOV_TOKEN` | Coverage upload | ci-core.yml |

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `APP_ENV` | Ephemeral environment ID | `main` |
| `NEXT_PUBLIC_APP_ENV` | Client-side env ID | `main` |
| `CI_JOB_TYPE` | Metrics job type | `unknown` |
| `GITHUB_SHA` | Commit SHA | Auto-provided |
| `GITHUB_REF_NAME` | Branch name | Auto-provided |

---

## Troubleshooting

### AI Review Not Working
- Check `OPENAI_API_KEY` is set in secrets
- Verify PR is not a draft
- Check GitHub Actions logs for API errors

### Sharding Issues
- Ensure tests are isolated (no shared state)
- Check Playwright config supports sharding
- Verify all shards complete

### Ephemeral DB Not Created
- Check `APP_ENV` is set correctly
- Verify `SUPABASE_DB_URL` is available
- Check Supabase connection

### Canary Analysis Failing
- Review `.canary-analysis.json` for details
- Check thresholds in `analyze-canary.ts`
- Verify smoke tests produce valid results

### Metrics Not Exporting
- Check `ci-metrics/` directory exists
- Verify test results are available
- Review script logs for parse errors

---

## Future Enhancements

- **AI Review**: Fine-tune prompts for better suggestions
- **Sharding**: Dynamic shard count based on test count
- **Ephemeral DB**: Automatic cleanup of old PR schemas
- **Canary Analysis**: Machine learning for threshold optimization
- **Metrics**: Real-time streaming to dashboard

---

## References

- [Playwright Sharding](https://playwright.dev/docs/test-sharding)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Supabase Schema Management](https://supabase.com/docs/guides/database/managing-schemas)
