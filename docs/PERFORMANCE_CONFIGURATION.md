# Performance Monitoring Configuration

This document describes how to configure the performance monitoring and alerting system for production deployment.

## Environment Variables

### Required for Production

```bash
# Deployment Environment
DEPLOY_ENV=production

# Alert Channels
SLACK_WEBHOOK_URL_PROD=https://hooks.slack.com/services/your/production/webhook
ALERT_EMAIL=alerts@your-domain.com

# Optional - Critical Alerts
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-integration-key
```

### Staging Environment

```bash
# Deployment Environment
DEPLOY_ENV=staging

# Alert Channels  
SLACK_WEBHOOK_URL_STAGING=https://hooks.slack.com/services/your/staging/webhook
ALERT_EMAIL=staging-alerts@your-domain.com
```

### Development Environment

```bash
# Deployment Environment (optional, defaults to NODE_ENV)
DEPLOY_ENV=development

# Alerts are disabled by default in development
```

## Performance Thresholds

### Production Thresholds
- **Response Time**: 5 seconds (strict for production)
- **Memory Usage**: 512MB (optimized for cost)
- **CPU Usage**: 80% (leaves headroom for spikes)
- **Request Rate**: 1000 requests/minute
- **Error Rate**: 5% (low error tolerance)
- **Cost Limit**: $15/hour
- **Alert Threshold**: 75% of limit (early warning)

### Staging Thresholds
- **Response Time**: 7 seconds
- **Memory Usage**: 768MB
- **CPU Usage**: 85%
- **Request Rate**: 1500 requests/minute
- **Error Rate**: 7%
- **Cost Limit**: $25/hour
- **Alert Threshold**: 80% of limit

### Development Thresholds
- **Response Time**: 10 seconds (lenient for dev)
- **Memory Usage**: 1GB
- **CPU Usage**: 90%
- **Request Rate**: 2000 requests/minute
- **Error Rate**: 10% (more tolerant)
- **Cost Limit**: $50/hour
- **Alert Threshold**: 85% of limit

## Alert Channels

### Slack Integration

1. Create a Slack App or use Incoming Webhooks
2. Configure webhook URL in environment variables
3. Set up appropriate channels:
   - `#production-alerts` for production
   - `#staging-alerts` for staging

**Slack Message Format:**
- Color-coded by severity (red=critical, orange=warning)
- Includes environment, violations, and metrics
- Formatted for easy reading

### Email Alerts

- Currently logs email alerts to console
- Ready for integration with SendGrid, SES, or similar service
- Include implementation in `alertService.ts`

### PagerDuty Integration

- Only triggers for CRITICAL severity alerts
- Includes full context and metrics
- Uses v2 Events API

## Admin Dashboard Access

1. Navigate to `/admin/performance`
2. View real-time metrics and violations
3. Test alert configuration with "Test Alerts" button
4. Monitor alert channel status

## Testing Alerts

### From Admin Dashboard
1. Go to Performance Monitor
2. Click "Test Alerts" button
3. Check configured channels for test message

### From API
```bash
curl -X POST /api/admin/test-alerts \
  -H "Content-Type: application/json" \
  -d '{
    "severity": "warning",
    "testMessage": "Test alert from API"
  }'
```

## Critical Thresholds

These thresholds trigger immediate CRITICAL alerts regardless of environment:

- **Response Time**: 15 seconds (system essentially down)
- **Memory Usage**: 2GB (serious memory leak)
- **CPU Usage**: 95% (system overload)
- **Error Rate**: 25% (major system failure)
- **Request Rate**: 5000/minute (potential DDoS)

## Alert Severity Levels

1. **INFO** - Normal operational events
2. **WARNING** - Approaching limits (90% of threshold)
3. **ERROR** - Threshold exceeded
4. **CRITICAL** - Critical threshold exceeded or 20%+ over limit

## Configuration Validation

The system automatically validates configuration on startup and provides:

- Environment-specific thresholds
- Alert channel availability
- Test functionality
- Real-time status in admin dashboard

## Production Deployment Checklist

- [ ] Set `DEPLOY_ENV=production`
- [ ] Configure Slack webhook URL
- [ ] Set alert email address
- [ ] Optional: Configure PagerDuty
- [ ] Test alert channels from admin dashboard
- [ ] Verify thresholds are appropriate for your infrastructure
- [ ] Monitor initial deployment for alert volume

## Troubleshooting

### Alerts Not Sending
1. Check environment variables are set
2. Verify webhook URLs are accessible
3. Test from admin dashboard
4. Check console logs for errors

### Too Many Alerts
1. Adjust thresholds in configuration
2. Increase `alertThreshold` percentage
3. Review metrics for baseline performance

### Missing Metrics
1. Ensure performance guardrails are enabled
2. Check if monitoring is active in admin dashboard
3. Verify API endpoints are being instrumented

## Integration Examples

### Next.js API Route
```typescript
import { withPerformanceMonitoring } from '@/lib/performance/guardrails'

export const POST = withPerformanceMonitoring(async (request) => {
  // Your API logic here
}, 'api_endpoint_name')
```

### React Component
```typescript
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'

function MyComponent() {
  useRenderPerformance('MyComponent')
  // Component logic
}
```

For more detailed implementation examples, see the source code in `src/lib/performance/` and `src/hooks/usePerformanceMonitoring.ts`.

