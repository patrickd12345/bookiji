# LogsAI - Log Pattern Detector and Anomaly Explainer

LogsAI is Bookiji's log intelligence specialist that provides analytical, pattern-focused analysis of system logs, error logs, and booking logs.

## Overview

LogsAI helps operations teams:
- **Read** summarized logs from multiple sources
- **Detect** new error patterns automatically
- **Highlight** regressions (patterns that reappear after resolution)
- **Correlate** errors with deployments and events
- **Explain** anomalies with clear, analytical insights

## Output Style

LogsAI follows an analytical, pattern-focused approach:
- **Analytical** - Data-driven insights, not assumptions
- **Pattern-focused** - Identifies recurring patterns and anomalies
- **Correlational** - Shows correlations, not causation (unless clear evidence exists)
- **Clear explanations** - Human-readable insights for operators

## API Endpoints

### Analyze Error Logs
```bash
GET /api/ops/logs/errors
```

**Query Parameters:**
- `startTime` (optional): ISO timestamp for start of time range
- `endTime` (optional): ISO timestamp for end of time range
- `lookbackHours` (optional): Hours to look back (default: `24`)

**Response:**
```json
{
  "ok": true,
  "data": {
    "timestamp": "2025-12-07T13:00:00Z",
    "category": "error",
    "timeRange": {
      "start": "2025-12-06T13:00:00Z",
      "end": "2025-12-07T13:00:00Z"
    },
    "totalLogs": 1523,
    "errorCount": 234,
    "warningCount": 45,
    "criticalCount": 12,
    "newPatterns": [
      {
        "id": "pattern-123",
        "pattern": "Database connection timeout",
        "category": "error",
        "severity": "error",
        "description": "Failed to connect to database",
        "firstSeen": "2025-12-07T10:30:00Z",
        "lastSeen": "2025-12-07T12:45:00Z",
        "occurrenceCount": 15,
        "affectedServices": ["/api/quote", "/api/bookings"],
        "isRegression": false
      }
    ],
    "recurringPatterns": [...],
    "regressions": [
      {
        "id": "pattern-456",
        "pattern": "Stripe webhook validation failed",
        "category": "error",
        "severity": "error",
        "description": "Webhook signature validation error",
        "firstSeen": "2025-12-01T08:00:00Z",
        "lastSeen": "2025-12-07T11:20:00Z",
        "occurrenceCount": 8,
        "affectedServices": ["stripe-webhook"],
        "isRegression": true,
        "resolvedAt": "2025-12-05T14:00:00Z"
      }
    ],
    "deploymentCorrelations": [
      {
        "deploymentSha": "abc123",
        "deploymentTime": "2025-12-07T09:00:00Z",
        "correlatedLogs": 23,
        "patterns": ["Database connection timeout", "Query timeout"]
      }
    ],
    "topErrors": [
      {
        "message": "Database connection timeout",
        "count": 15,
        "firstSeen": "2025-12-07T10:30:00Z",
        "lastSeen": "2025-12-07T12:45:00Z",
        "affectedServices": ["/api/quote", "/api/bookings"]
      }
    ],
    "insights": [
      "⚠️ 1 regression(s) detected: patterns that reappeared after resolution",
      "🔍 3 new error pattern(s) detected",
      "📦 2 deployment(s) correlated with 23 log entries",
      "📊 High error rate: 15.4% of logs are errors (234/1523)",
      "🎯 Service /api/quote has 45 error(s) - highest error count"
    ]
  }
}
```

### Analyze System Logs
```bash
GET /api/ops/logs/system
```

**Query Parameters:**
- `startTime` (optional): ISO timestamp for start of time range
- `endTime` (optional): ISO timestamp for end of time range
- `lookbackHours` (optional): Hours to look back (default: `24`)

**Response:** Same structure as error logs endpoint, with `category: "system"`

### Analyze Booking Logs
```bash
GET /api/ops/logs/booking
```

**Query Parameters:**
- `startTime` (optional): ISO timestamp for start of time range
- `endTime` (optional): ISO timestamp for end of time range
- `lookbackHours` (optional): Hours to look back (default: `24`)

**Response:** Same structure as error logs endpoint, with `category: "booking"`

### Pattern-Based Event Log Analysis
```bash
GET /api/ops/events/logs/[pattern]
```

**Query Parameters:**
- `pattern` (optional): Pattern to match (can also be in URL path)
- `startTime` (optional): ISO timestamp for start of time range
- `endTime` (optional): ISO timestamp for end of time range
- `lookbackHours` (optional): Hours to look back (default: `24`)
- `source` (optional): Filter by source (e.g., `api`, `database`, `stripe`)
- `service` (optional): Filter by service (e.g., `/api/quote`, `stripe-webhook`)
- `severity` (optional): Filter by severity (`info`, `warning`, `error`, `critical`)

**Response:** Same structure as error logs endpoint, with additional `filters` field showing applied filters

## Pattern Detection

LogsAI automatically detects patterns by:
1. **Normalizing** log messages (removing UUIDs, timestamps, numbers, emails, URLs)
2. **Grouping** similar error messages
3. **Tracking** pattern occurrences over time
4. **Identifying** regressions (patterns that reappear after being resolved)

## Regression Detection

A pattern is marked as a regression if:
- It was previously seen and resolved (has a `resolvedAt` timestamp)
- It reappears after the resolution timestamp

## Deployment Correlation

LogsAI correlates errors with deployments by:
- Finding deployment events in the ops events store
- Looking for errors within 1 hour after each deployment
- Identifying patterns that correlate with specific deployments

## Usage Examples

### Get error log analysis for last 24 hours
```bash
curl http://localhost:3000/api/ops/logs/errors
```

### Get error log analysis for specific time range
```bash
curl "http://localhost:3000/api/ops/logs/errors?startTime=2025-12-07T00:00:00Z&endTime=2025-12-07T23:59:59Z"
```

### Get system log analysis
```bash
curl http://localhost:3000/api/ops/logs/system?lookbackHours=48
```

### Get booking log analysis
```bash
curl http://localhost:3000/api/ops/logs/booking
```

### Analyze logs matching a pattern
```bash
curl "http://localhost:3000/api/ops/events/logs/database?severity=error"
```

### Analyze logs from a specific service
```bash
curl "http://localhost:3000/api/ops/events/logs?service=/api/quote&lookbackHours=12"
```

## Data Sources

LogsAI aggregates logs from multiple sources:
- **Stored logs** - Logs stored in `ops-state/logs.json`
- **Ops events** - Events from `ops-state/events.json` (converted to log format)
- **Database logs** - Audit logs and access logs (when available)
- **System logs** - Performance metrics and system events

## Pattern Storage

Detected patterns are stored in `ops-state/log-patterns.json` and persist across analysis runs to enable regression detection.

## Integration

LogsAI integrates with:
- **IncidentsAI** - Can correlate patterns with incidents
- **Ops Events** - Reads from ops events store
- **Deployments** - Correlates errors with deployment events
- **Monitoring** - Can ingest signals from monitoring systems

## Scope

LogsAI operates on:
- `/ops/logs/errors` - Error log analysis
- `/ops/logs/system` - System log analysis
- `/ops/logs/booking` - Booking log analysis
- `/ops/events/logs/*` - Pattern-based event log analysis
