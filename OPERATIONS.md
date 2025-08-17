# Bookiji Operations & SLOs

## Service Level Objectives (SLOs)

### Availability
- **Target**: ≥ 99.9% monthly (≤ 43m downtime)
- **Measurement**: Synthetic monitoring every 15 minutes
- **Alerting**: Immediate notification on failure

### API Performance
- **Create Payment Intent**: p95 < 700ms, p99 < 1.2s
- **Other APIs**: p95 < 400ms, p99 < 800ms
- **Error Rate**: < 0.5% (99.5% success rate, excluding 429 rate limits)

### User Experience
- **Booking Flow**: p95 < 1.5s to payment screen
- **Confirmation**: p95 < 2.0s when actually charging
- **Homepage Load**: p95 < 2.0s, p99 < 3.5s

### Rate Limiting
- **Behavior**: Graceful 429s with retry-after headers
- **No 5xx bursts**: Maintain service stability under load

## Monitoring Strategy

### 1. Load Testing (k6)
- **Frequency**: On every PR, manual triggers
- **Target**: 20 RPS sustained, 200 RPS burst
- **Thresholds**: <0.5% errors, p95 < 700ms, p99 < 1.2s

### 2. Visual Regression
- **Frequency**: On every PR
- **Coverage**: Home page themes, responsive breakpoints
- **Viewports**: Desktop (1280x800), Tablet (768x1024), Mobile (375x667)
- **Branch Protection**: Required for main merges

### 3. Synthetic Monitoring
- **Frequency**: Every 15 minutes in production
- **Tests**: Health checks, admin guards, calendar links
- **Alerting**: Slack/Discord webhooks on failure
- **Two-Strike Rule**: Alert only after 2 consecutive failures
- **Multi-Region**: GitHub Actions + secondary provider

## Incident Response

### P0 - Critical (Service Down)
- **Response Time**: < 5 minutes
- **Escalation**: Immediate team notification
- **Recovery Target**: < 15 minutes

### P1 - High (Performance Degradation)
- **Response Time**: < 15 minutes
- **Escalation**: Within 1 hour
- **Recovery Target**: < 2 hours

### P2 - Medium (Feature Issues)
- **Response Time**: < 2 hours
- **Escalation**: Within 4 hours
- **Recovery Target**: < 24 hours

## Performance Budgets

### Frontend
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

### Backend
- **Database Queries**: < 100ms p95
- **External API Calls**: < 500ms p95
- **File Uploads**: < 2s for 5MB

## Load Testing Scenarios

### Burst Testing
1. **Ramp Up**: 0 → 20 RPS over 1 minute
2. **Sustain**: 20 RPS for 3 minutes
3. **Ramp Down**: 20 → 0 RPS over 1 minute

### Stress Testing
1. **Baseline**: 5 RPS for 2 minutes
2. **Stress**: 50 RPS for 5 minutes
3. **Recovery**: 5 RPS for 2 minutes

## Alerting Channels

### Slack/Discord
- **Webhook URL**: Set in `ALERT_WEBHOOK_URL` secret
- **Format**: JSON with text field
- **Rate Limiting**: Max 1 alert per 5 minutes

### Email (Future)
- **Recipients**: DevOps team, Engineering leads
- **Frequency**: Daily digest + immediate for P0/P1

## Maintenance Windows

### Scheduled
- **Frequency**: Monthly on first Sunday
- **Duration**: 2 hours (2:00-4:00 AM UTC)
- **Notification**: 48 hours advance notice

### Emergency
- **Notification**: Immediate team notification
- **Approval**: Engineering lead or DevOps engineer
- **Documentation**: Post-incident report within 24 hours

## Runbooks

### Load Test Failures
1. Check k6 output for specific failure points
2. Verify test environment connectivity
3. Review recent deployments for performance regressions
4. Scale resources if needed

### Visual Regression Failures
1. Compare screenshots to identify changes
2. Determine if changes are intentional
3. Update baseline screenshots if needed
4. Investigate CSS/component changes

### Synthetic Monitor Failures
1. Check production environment status
2. Verify test data availability
3. Review recent deployments
4. Check external service dependencies

## Go/No-Go Launch Criteria

### Ship when ALL are true:
- **Visuals stable**: No unexpected diffs on PRs
- **Synthetics green**: 24h continuous success (both regions)
- **k6 performance**: p95 < 700ms, error rate < 0.5% on $1 flow
- **Dress rehearsal**: Signed payments test passes with booking → confirmed
- **Webhook delivery**: Stripe dashboard shows 200 responses, retries disabled

### Performance Budgets
- **Homepage**: p95 < 2.0s (cold), p99 < 3.5s
- **Key APIs**: p95 < 400-700ms, p99 < 1.2s
- **$1 flow success**: > 99.5% rolling 1h, > 99.9% daily
- **Availability**: 99.9% monthly (≈43m downtime)

## Metrics Collection

### Application Metrics
- Request duration percentiles
- Error rates by endpoint
- Database query performance
- External API response times

### Infrastructure Metrics
- CPU, memory, disk usage
- Network latency and throughput
- Database connection pool status
- Cache hit rates

### Business Metrics
- Booking conversion rates
- Payment success rates
- User session duration
- Feature adoption rates

