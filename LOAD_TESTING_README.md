# Bookiji Load Testing & Monitoring Setup

## Overview

This setup provides comprehensive testing and monitoring for the $1 booking path:

1. **k6 Load Testing** - API performance under load
2. **Playwright Performance Testing** - End-to-end UX timing
3. **Visual Regression Testing** - UI consistency across themes/viewports
4. **Synthetic Monitoring** - Production health checks every 15 minutes

## Quick Start

### 1. Generate Visual Snapshots
```bash
pnpm run visual:snapshots
```

### 2. Run Load Tests Locally
```bash
# Install k6 (macOS)
brew install k6

# Install k6 (Windows)
choco install k6

# Install k6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C22D4CD0E9DE
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Run load test
k6 run load/k6-booking.js -e BASE_URL=http://localhost:3000 -e TEST_SERVICE_ID=your_test_service_id
```

### 3. Run Performance Tests
```bash
npx playwright test tests/perf/
```

### 4. Run Visual Tests
```bash
npx playwright test tests/visual/
```

## CI/CD Integration

### Load Testing Workflow
- **Trigger**: Every PR, manual dispatch
- **Action**: `grafana/k6-action@v0.3.1`
- **Target**: Preview deployments
- **Thresholds**: <1% errors, p95 < 1.5s

### Visual Regression Workflow
- **Trigger**: Every PR
- **Action**: Playwright with deterministic viewports
- **Coverage**: Home page themes, responsive breakpoints

### Synthetic Monitoring
- **Trigger**: Every 15 minutes in production
- **Tests**: Health checks, admin guards, calendar links
- **Alerting**: Slack/Discord webhooks

## Configuration

### Environment Variables
```bash
# Required for load testing
BASE_URL=https://your-domain.com
TEST_SERVICE_ID=your_test_service_id

# Required for monitoring
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook
```

### GitHub Secrets
```yaml
# Load Testing
TEST_SERVICE_ID: "your_test_service_id"

# Monitoring
ALERT_WEBHOOK_URL: "https://hooks.slack.com/your-webhook"

# Vercel (for preview deployments)
VERCEL_TOKEN: "your_vercel_token"
ORG_ID: "your_org_id"
PROJECT_ID: "your_project_id"
```

## Test Scenarios

### k6 Load Testing
```javascript
// Burst Testing
stages: [
  { duration: '1m', target: 20 },  // Ramp to 20 RPS
  { duration: '3m', target: 20 },  // Hold
  { duration: '1m', target: 0 },   // Ramp down
]
```

**Performance Targets:**
- Error Rate: < 1%
- Response Time: p95 < 1.5s
- Throughput: 20 RPS sustained

### Playwright Performance
**Timing Budgets:**
- Homepage Load: < 2s
- Booking Flow: < 2.5s to payment
- API Response: < 1.5s p95

### Visual Regression
**Viewports:**
- Desktop: 1280x800
- Tablet: 768x1024
- Mobile: 375x667

**Themes:**
- Light (default)
- Dark

## Monitoring & Alerting

### SLOs (Service Level Objectives)
- **Availability**: ≥ 99.9% monthly
- **API Performance**: p95 < 1.5s
- **UX Performance**: p95 < 2.5s
- **Error Rate**: < 1%

### Alert Channels
- **Slack/Discord**: Immediate failure notifications
- **Email**: Daily digest + P0/P1 alerts
- **Dashboard**: Grafana Cloud metrics

## Troubleshooting

### Load Test Failures
1. Check k6 output for specific failure points
2. Verify test environment connectivity
3. Review recent deployments
4. Check rate limiting configuration

### Visual Test Failures
1. Compare screenshots to identify changes
2. Determine if changes are intentional
3. Update baseline: `npx playwright test --update-snapshots`
4. Check CSS/component changes

### Monitor Failures
1. Verify production environment status
2. Check test data availability
3. Review recent deployments
4. Verify external dependencies

## Advanced Configuration

### Custom Load Test Scenarios
```javascript
// Stress Testing
stages: [
  { duration: '2m', target: 5 },   // Baseline
  { duration: '5m', target: 50 },  // Stress
  { duration: '2m', target: 5 },   // Recovery
]
```

### Custom Performance Budgets
```typescript
// In tests/perf/booking.spec.ts
expect(total).toBeLessThan(3000); // Custom budget
```

### Custom Viewports
```typescript
// In tests/visual/home.spec.ts
await page.setViewportSize({ width: 1920, height: 1080 });
```

## Metrics & Reporting

### k6 Metrics
- Request duration percentiles
- Error rates by endpoint
- Throughput (RPS)
- Virtual user count

### Playwright Metrics
- Page load times
- API response times
- Visual regression results
- Test execution times

### Production Metrics
- Uptime percentage
- Response time trends
- Error rate trends
- Resource utilization

## Best Practices

### Load Testing
1. Start with realistic user scenarios
2. Gradually increase load to find breaking points
3. Monitor system resources during tests
4. Clean up test data after runs

### Visual Testing
1. Use deterministic viewports
2. Update snapshots for intentional changes
3. Test across multiple themes
4. Include responsive breakpoints

### Monitoring
1. Set realistic SLOs
2. Use multiple alert channels
3. Document runbooks for common issues
4. Regular review of alert thresholds

## Support

### Documentation
- [k6 Documentation](https://k6.io/docs/)
- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions](https://docs.github.com/en/actions)

### Community
- [k6 Community](https://community.k6.io/)
- [Playwright Community](https://playwright.dev/community)
- [GitHub Discussions](https://github.com/features/discussions)

### Internal Resources
- `OPERATIONS.md` - SLOs and incident response
- `CI_CD_SETUP.md` - Deployment configuration
- `TEST_RESULTS_DASHBOARD.md` - Test status tracking

