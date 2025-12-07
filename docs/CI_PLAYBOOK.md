# CI/CD Playbook

Complete guide to Bookiji's CI/CD system from Level 1 through Level 5.

## Table of Contents

1. [Overview](#overview)
2. [CI Levels](#ci-levels)
3. [Incident Lifecycle](#incident-lifecycle)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

---

## Overview

Bookiji uses a 5-level CI/CD maturity model:

- **Level 1-2**: Basic CI, canaries, chaos testing
- **Level 3**: AI PR review, ephemeral DB, canary analysis
- **Level 4**: Predictive CI, ephemeral envs, traffic shadowing, SLO dashboard, watchdog
- **Level 5**: Self-healing CI, regression detection, performance insights, resource optimization

---

## CI Levels

### Level 1-2: Foundation

**Workflows:**
- `ci-core.yml` - Lint, typecheck, tests, coverage
- `ci-e2e.yml` - E2E tests, canary deployment
- `ci-performance.yml` - Lighthouse, Sentry checks
- `monitoring.yml`, `loadtest.yml`, `security.yml`

**Features:**
- Automated testing
- Canary deployments
- Performance monitoring
- Security scanning

**Documentation:** See individual workflow files

### Level 3: Enterprise

**Features:**
- AI-assisted PR review
- Ephemeral database per PR
- Auto canary analysis
- CI metrics export

**Documentation:** `docs/LEVEL3_ENHANCEMENTS.md`

### Level 4: Autonomous

**Features:**
- Predictive test selection
- Full ephemeral environments
- Traffic shadowing
- SLO dashboard
- Production watchdog
- Immutable deployments

**Documentation:** `docs/LEVEL4_ENHANCEMENTS.md`

### Level 5: Self-Healing

**Features:**
- Flaky test quarantine
- Regression detection
- Performance insights
- CI resource optimization
- Enhanced incident lifecycle

**Documentation:** `docs/LEVEL5_ENHANCEMENTS.md`

---

## Incident Lifecycle

### Detection

**Sources:**
1. **Production Watchdog** - Health checks every 10 minutes
2. **Regression Analyzer** - Metrics analysis every 30 minutes
3. **Performance Insights** - After E2E workflow completion
4. **Manual Reports** - Team-reported issues

### Creation

**Automatic Issue Creation:**
- Watchdog creates `[incident] Production degradation detected`
- Regression analyzer creates `[regression] Reliability/Performance degradation`
- Performance insights creates `[performance] LCP/CLS regression detected`

**Issue Labels:**
- `incident` - Production incidents
- `regression` - Performance/reliability regressions
- `performance` - Performance issues
- `watchdog` - Auto-detected by watchdog
- `flaky-tests` - Flaky test detection

### Tracking

**Issue Updates:**
- Watchdog appends comments with new evidence
- Regression analyzer updates with latest metrics
- Performance insights updates with new recommendations

### Resolution

**Auto-Resolution:**
- Watchdog detects when conditions normalize
- Adds resolution comment
- Optionally closes issue (if `ALLOW_AUTO_CLOSE_INCIDENTS=true`)
- Or adds `resolved` label

**Manual Resolution:**
- Team reviews and fixes root cause
- Closes issue manually
- Documents resolution in issue comments

### Post-Mortem

**After Resolution:**
1. Review incident timeline
2. Identify root cause
3. Document lessons learned
4. Update runbooks/playbooks
5. Prevent recurrence

---

## Best Practices

### Test Management

1. **Fix flaky tests promptly**
   - Review `ci-history/quarantined-tests.json` regularly
   - Un-quarantine fixed tests
   - Prevent new flakiness

2. **Use predictive test selection**
   - Let CI run only relevant tests
   - Override with `CI_PREDICTIVE_OFF=true` if needed

3. **Monitor test history**
   - Check `ci-history/tests.json` for trends
   - Identify slow tests
   - Optimize test execution

### Deployment Management

1. **Use canary deployments**
   - Always deploy to canary first
   - Validate with smoke tests
   - Promote only after validation

2. **Monitor regressions**
   - Review `regressions/regression-report.json`
   - Investigate suspect commits
   - Rollback if necessary

3. **Track immutable deployments**
   - Use deployment metadata
   - Keep rollback targets available
   - Document deployment history

### Performance Management

1. **Monitor SLO compliance**
   - Review `slo/slo-summary.json` daily
   - Address compliance failures
   - Track trends over time

2. **Act on performance insights**
   - Prioritize high-priority recommendations
   - Review `perf-insights/perf-report.md`
   - Implement optimizations

3. **Optimize CI resources**
   - Review `ci-optimizer/suggestions.json`
   - Adjust shard count based on runtime
   - Balance speed vs cost

### Incident Management

1. **Respond promptly**
   - Monitor watchdog issues
   - Investigate root causes
   - Document resolutions

2. **Use auto-resolution carefully**
   - Enable only if trusted
   - Keep issues open for analysis
   - Review auto-resolved incidents

3. **Learn from incidents**
   - Conduct post-mortems
   - Update documentation
   - Prevent recurrence

---

## Troubleshooting

### CI Not Running

**Check:**
1. Workflow file syntax (YAML valid)
2. Branch protection rules
3. Workflow permissions
4. GitHub Actions quota

### Tests Failing

**Check:**
1. Test history: `ci-history/tests.json`
2. Quarantined tests: `ci-history/quarantined-tests.json`
3. Recent changes in PR
4. Environment variables

### Deployments Failing

**Check:**
1. Vercel deployment logs
2. Canary analysis: `.canary-analysis.json`
3. Regression report: `regressions/regression-report.json`
4. Watchdog results: `watchdog-result.json`

### Performance Degrading

**Check:**
1. Performance insights: `perf-insights/perf-report.md`
2. SLO summary: `slo/slo-summary.json`
3. Regression report: `regressions/regression-report.json`
4. Lighthouse scores in CI metrics

### Incidents Not Resolving

**Check:**
1. Watchdog checks: `watchdog-result.json`
2. Health endpoint status
3. `ALLOW_AUTO_CLOSE_INCIDENTS` setting
4. GitHub API permissions

---

## Quick Reference

### Key Files

- `ci-history/tests.json` - Test statistics
- `ci-history/quarantined-tests.json` - Quarantined tests
- `regressions/regression-report.json` - Regression analysis
- `perf-insights/perf-report.md` - Performance recommendations
- `ci-optimizer/suggestions.json` - CI optimization suggestions
- `slo/slo-summary.json` - SLO compliance status

### Key Scripts

- `scripts/update-test-history.ts` - Update test statistics
- `scripts/quarantine-flaky-tests.ts` - Detect flaky tests
- `scripts/detect-regressions.ts` - Detect regressions
- `scripts/suggest-rollback.ts` - Suggest rollbacks
- `scripts/analyze-performance-trends.ts` - Analyze performance
- `scripts/optimize-ci-resources.ts` - Optimize CI resources
- `scripts/production-watchdog.ts` - Monitor production

### Key Workflows

- `.github/workflows/ci-e2e.yml` - E2E tests with history tracking
- `.github/workflows/regression-analyzer.yml` - Regression detection
- `.github/workflows/perf-insights.yml` - Performance insights
- `.github/workflows/watchdog.yml` - Production monitoring

---

## See Also

- `docs/LEVEL3_ENHANCEMENTS.md` - Level 3 features
- `docs/LEVEL4_ENHANCEMENTS.md` - Level 4 features
- `docs/LEVEL5_ENHANCEMENTS.md` - Level 5 features
- `docs/SLO_DASHBOARD.md` - SLO dashboard guide
- `docs/IMMUTABLE_DEPLOYS.md` - Immutable deployments

---

**Last Updated:** December 7, 2025
