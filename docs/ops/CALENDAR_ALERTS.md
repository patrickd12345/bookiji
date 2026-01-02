# Calendar Sync Alert Definitions

Date: 2026-01-02
Operator: Platform Engineering

## Overview

This document defines alert conditions for calendar sync operations. Alerts should be configured in the external monitoring system (Prometheus, Datadog, New Relic, etc.) to notify on-call engineers of calendar sync issues.

## Alert Definitions

### 1. Calendar Sync Failure Rate

**Alert Name:** `calendar_sync_high_failure_rate`

**Condition:**
- `calendar_sync_failures_total` > 5 in 5 minutes
- OR failure rate > 10% of total sync runs in 5 minutes

**Severity:** High

**Description:**
Calendar sync is experiencing elevated failure rates. This may indicate:
- External calendar API issues (Google/Microsoft outages)
- Authentication token expiration
- Rate limiting from external providers
- Network connectivity issues

**Actions:**
1. Check external calendar provider status pages
2. Review error logs for authentication failures
3. Verify token refresh mechanisms
4. Check for rate limiting responses

**Alert Routing:**
- PagerDuty: High priority
- Slack: #calendar-ops channel
- Email: calendar-ops@bookiji.com

---

### 2. Calendar Sync Latency

**Alert Name:** `calendar_sync_high_latency`

**Condition:**
- `calendar_sync_latency_ms` p95 > 5000ms (5 seconds) for 10 minutes
- OR `calendar_sync_latency_ms` p99 > 10000ms (10 seconds) for 5 minutes

**Severity:** Medium

**Description:**
Calendar sync operations are taking longer than expected. This may indicate:
- External API slowdowns
- Database query performance issues
- Network latency
- Resource contention

**Actions:**
1. Check external calendar provider status
2. Review database query performance
3. Check system resource usage (CPU, memory)
4. Review recent code deployments

**Alert Routing:**
- PagerDuty: Medium priority
- Slack: #calendar-ops channel

---

### 3. Calendar Sync Stalled

**Alert Name:** `calendar_sync_stalled`

**Condition:**
- `calendar_sync_runs_total` == 0 for 30 minutes
- AND `CALENDAR_JOBS_ENABLED=true`
- AND at least one allowlisted provider exists

**Severity:** High

**Description:**
Calendar sync jobs have stopped running. This may indicate:
- Job scheduler failure
- Feature flag misconfiguration
- Database connection issues
- Application crash

**Actions:**
1. Verify `CALENDAR_JOBS_ENABLED` flag status
2. Check job scheduler health
3. Review application logs for errors
4. Verify database connectivity
5. Check for recent deployments

**Alert Routing:**
- PagerDuty: High priority
- Slack: #calendar-ops channel
- Email: calendar-ops@bookiji.com

---

### 4. Calendar Sync Items Processed Anomaly

**Alert Name:** `calendar_sync_items_anomaly`

**Condition:**
- `calendar_sync_items_processed` deviates > 50% from 7-day average
- AND deviation persists for 15 minutes

**Severity:** Low

**Description:**
Unusual number of calendar items processed. This may indicate:
- Provider calendar changes (legitimate)
- Sync logic issues
- Data quality problems

**Actions:**
1. Review sync logs for patterns
2. Check for provider calendar changes
3. Verify sync logic correctness

**Alert Routing:**
- Slack: #calendar-ops channel (no PagerDuty)

---

## Alert Configuration Examples

### Prometheus Alert Rules

```yaml
groups:
  - name: calendar_sync
    interval: 30s
    rules:
      - alert: CalendarSyncHighFailureRate
        expr: |
          rate(calendar_sync_failures_total[5m]) > 5
          OR
          (rate(calendar_sync_failures_total[5m]) / rate(calendar_sync_runs_total[5m])) > 0.1
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Calendar sync failure rate is elevated"
          description: "{{ $value }} failures in the last 5 minutes"

      - alert: CalendarSyncHighLatency
        expr: |
          histogram_quantile(0.95, rate(calendar_sync_latency_ms_bucket[10m])) > 5000
          OR
          histogram_quantile(0.99, rate(calendar_sync_latency_ms_bucket[5m])) > 10000
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "Calendar sync latency is high"
          description: "P95 latency: {{ $value }}ms"

      - alert: CalendarSyncStalled
        expr: |
          rate(calendar_sync_runs_total[30m]) == 0
          AND
          calendar_jobs_enabled == 1
        for: 30m
        labels:
          severity: high
        annotations:
          summary: "Calendar sync jobs have stopped"
          description: "No sync runs in the last 30 minutes"
```

### Datadog Monitor Configuration

```json
{
  "name": "Calendar Sync High Failure Rate",
  "type": "metric alert",
  "query": "sum(last_5m):sum:calendar_sync_failures_total{*} > 5",
  "message": "@pagerduty-calendar-ops @slack-calendar-ops",
  "options": {
    "thresholds": {
      "critical": 5
    },
    "notify_no_data": false
  }
}
```

## Alert Response Runbook

### High Severity Alerts

1. **Acknowledge alert** in PagerDuty
2. **Check external provider status:**
   - Google Calendar: https://status.cloud.google.com/
   - Microsoft Graph: https://status.office.com/
3. **Review recent logs:**
   - Application logs for errors
   - Database logs for connection issues
4. **Verify feature flags:**
   - `CALENDAR_SYNC_ENABLED`
   - `CALENDAR_JOBS_ENABLED`
   - `CALENDAR_WEBHOOK_ENABLED`
5. **Check allowlist configuration:**
   - Verify `CALENDAR_ALLOWLIST_PROVIDER_IDS`
   - Verify `CALENDAR_ALLOWLIST_CONNECTION_IDS`
6. **If issue persists:**
   - Consider disabling calendar sync temporarily
   - Document incident in runbook
   - Escalate to on-call engineer

### Medium Severity Alerts

1. **Review metrics dashboard**
2. **Check for external API slowdowns**
3. **Monitor for 15 minutes**
4. **If issue persists, follow high severity steps**

### Low Severity Alerts

1. **Review in Slack channel**
2. **Check for legitimate causes (provider changes)**
3. **Monitor trends over 24 hours**

## Alert Testing

Alerts should be tested monthly to ensure:
- Alert routing works correctly
- Thresholds are appropriate
- Response procedures are effective

## Metrics Endpoint

Calendar metrics are available at:
- JSON: `GET /api/ops/metrics/calendar`
- Prometheus: `GET /api/ops/metrics/calendar?format=prometheus`

## References

- Calendar metrics implementation: `src/lib/calendar-sync/observability/metrics.ts`
- Metrics export endpoint: `src/app/api/ops/metrics/calendar/route.ts`
- Calendar sync runbook: `docs/runbooks/calendar-sync-operations.md`
