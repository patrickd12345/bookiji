# SLO Dashboard Integration Guide

This guide explains how to integrate Bookiji's SLO metrics export with monitoring dashboards.

## Overview

The SLO export system generates two JSON files:
- `slo/slo-summary.json` - Current compliance status
- `slo/slo-timeseries.json` - Historical time series data

These files are generated daily by `.github/workflows/slo-dashboard.yml` and uploaded as artifacts.

## File Formats

### slo-summary.json

Current SLO compliance snapshot:

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
    "bookingP50Latency": 320,
    "bookingP95Latency": 450,
    "uptimeApprox": 99.2,
    "totalRuns": 50,
    "successfulRuns": 49,
    "failedRuns": 1
  },
  "compliance": {
    "bookingLatency": true,
    "uptime": false,
    "overall": false
  }
}
```

**Fields:**
- `targets` - SLO targets (configurable via repo variables)
- `metrics` - Computed metrics from recent CI runs
- `compliance` - Boolean flags for each SLO target

### slo-timeseries.json

Historical data points:

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
    },
    {
      "timestamp": "2025-12-07T01:00:00Z",
      "commitSha": "def5678",
      "passRate": 95,
      "bookingP95Latency": 550,
      "passed": false
    }
  ]
}
```

## Integration Options

### Option 1: GitHub Pages Dashboard

1. **Enable GitHub Pages** in repository settings
2. **Create dashboard HTML** that reads JSON from artifacts
3. **Update workflow** to deploy JSON to `gh-pages` branch

**Example workflow step:**
```yaml
- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./slo
```

### Option 2: Grafana Integration

1. **Install Grafana JSON Data Source** plugin
2. **Configure data source** to read from GitHub artifacts API
3. **Create dashboard** panels:
   - Line chart: `bookingP95Latency` over time
   - Gauge: `uptimeApprox` percentage
   - Table: Compliance status

**Grafana Query Example:**
```json
{
  "datasource": "JSON",
  "url": "https://api.github.com/repos/your-org/bookiji/actions/artifacts",
  "jsonPath": "$.artifacts[?(@.name == 'slo-dashboard')]"
}
```

### Option 3: Supabase Dashboard

1. **Create table** for SLO metrics:
```sql
CREATE TABLE slo_metrics (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  pass_rate DECIMAL,
  booking_p95_latency INTEGER,
  uptime_approx DECIMAL,
  compliance_overall BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **Create Edge Function** to ingest JSON:
```typescript
// supabase/functions/ingest-slo/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const sloData = await req.json()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  await supabase.from('slo_metrics').insert({
    timestamp: sloData.timestamp,
    pass_rate: sloData.metrics.passRate,
    booking_p95_latency: sloData.metrics.bookingP95Latency,
    uptime_approx: sloData.metrics.uptimeApprox,
    compliance_overall: sloData.compliance.overall,
  })
  
  return new Response(JSON.stringify({ success: true }))
})
```

3. **Update workflow** to POST to Edge Function:
```yaml
- name: Ingest SLO metrics
  run: |
    curl -X POST https://your-project.supabase.co/functions/v1/ingest-slo \
      -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
      -H "Content-Type: application/json" \
      -d @slo/slo-summary.json
```

### Option 4: Custom Dashboard

**Simple HTML Dashboard:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Bookiji SLO Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>SLO Dashboard</h1>
  <div id="summary"></div>
  <canvas id="timeseries"></canvas>
  
  <script>
    // Fetch from GitHub artifacts or local file
    fetch('slo/slo-summary.json')
      .then(r => r.json())
      .then(data => {
        document.getElementById('summary').innerHTML = `
          <h2>Current Status</h2>
          <p>Pass Rate: ${data.metrics.passRate}%</p>
          <p>P95 Latency: ${data.metrics.bookingP95Latency}ms</p>
          <p>Uptime: ${data.metrics.uptimeApprox}%</p>
          <p>Compliance: ${data.compliance.overall ? '✅' : '❌'}</p>
        `
      })
    
    // Chart timeseries
    fetch('slo/slo-timeseries.json')
      .then(r => r.json())
      .then(data => {
        new Chart(document.getElementById('timeseries'), {
          type: 'line',
          data: {
            labels: data.runs.map(r => r.timestamp),
            datasets: [{
              label: 'P95 Latency (ms)',
              data: data.runs.map(r => r.bookingP95Latency),
            }]
          }
        })
      })
  </script>
</body>
</html>
```

## Configuration

### Setting SLO Targets

**Repository Variables:**
- `SLO_TARGET_BOOKING_LATENCY_MS` - Target P95 latency (default: 500ms)
- `SLO_TARGET_UPTIME` - Target uptime percentage (default: 99.9)

**Set via GitHub UI:**
1. Repository → Settings → Secrets and variables → Actions → Variables
2. Add `SLO_TARGET_BOOKING_LATENCY_MS` = `500`
3. Add `SLO_TARGET_UPTIME` = `99.9`

### Customizing Metrics Window

Edit `scripts/export-slo.ts`:
```typescript
const metrics = loadRecentMetrics(100) // Change 100 to desired window
```

## Monitoring Best Practices

1. **Alert on Compliance Failures**
   - Set up alerts when `compliance.overall` is `false`
   - Notify team via Slack/email

2. **Track Trends**
   - Monitor `bookingP95Latency` for degradation
   - Watch `uptimeApprox` for availability issues

3. **Correlate with Deployments**
   - Link `commitSha` in timeseries to deployment events
   - Identify problematic commits

4. **Set Up Dashboards**
   - Display current compliance status prominently
   - Show historical trends
   - Include error budget burn rate

## Troubleshooting

### No Metrics Available

**Problem:** `slo-summary.json` shows `"period": "insufficient_data"`

**Solution:**
- Ensure `ci-e2e.yml` is running and exporting metrics
- Check that `ci-metrics/` directory has JSON files
- Verify `export-ci-metrics.ts` is being called

### Metrics Not Updating

**Problem:** Dashboard shows stale data

**Solution:**
- Check `slo-dashboard.yml` workflow is running (daily at 3 AM UTC)
- Verify artifacts are being uploaded
- Ensure dashboard is fetching latest artifacts

### Compliance Always False

**Problem:** SLO targets too strict

**Solution:**
- Review actual metrics vs targets
- Adjust `SLO_TARGET_BOOKING_LATENCY_MS` or `SLO_TARGET_UPTIME`
- Consider historical performance when setting targets

## See Also

- `docs/LEVEL4_ENHANCEMENTS.md` - Complete Level 4 documentation
- `scripts/export-slo.ts` - SLO export script source
- `.github/workflows/slo-dashboard.yml` - Dashboard workflow
