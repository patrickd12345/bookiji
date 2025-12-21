# IncidentsAI - Incident Manager and Triage Coordinator

IncidentsAI is Bookiji's incident-tracking specialist that provides structured, actionable triage summaries for operational incidents.

## Overview

IncidentsAI helps operations teams:
- **Summarize** open incidents with clear, structured information
- **Analyze** severity based on shared signals and context
- **Recommend** which incidents require immediate attention
- **Maintain** contextual memory about ongoing issues
- **Never** resolves or modifies incidents unless explicitly instructed

## API Endpoints

### List Incidents
```bash
GET /api/ops/incidents/list
```

**Query Parameters:**
- `status` (optional): Filter by status (`open`, `investigating`, `mitigating`, `resolved`, `closed`)
- `severity` (optional): Filter by severity (`low`, `medium`, `high`, `critical`)
- `openOnly` (optional): If `true`, only return open incidents

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "title": "High latency on /api/quote endpoint",
      "severity": "high",
      "status": "open",
      "signals": [...],
      "affectedServices": ["/api/quote"],
      ...
    }
  ],
  "count": 1
}
```

### Get Incident
```bash
GET /api/ops/incidents/[id]
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "severity": "high",
    "status": "open",
    "signals": [...],
    ...
  }
}
```

### IncidentsAI Triage Summary
```bash
GET /api/ops/incidents/ai-triage
```

**Query Parameters:**
- `includeResolved` (optional): Include resolved incidents in context (default: `false`)
- `lookbackHours` (optional): Hours to look back for resolved incidents (default: `24`)

**Response:**
```json
{
  "ok": true,
  "data": {
    "timestamp": "2025-12-07T13:00:00Z",
    "openIncidentsCount": 3,
    "criticalCount": 1,
    "highCount": 1,
    "mediumCount": 1,
    "lowCount": 0,
    "summaries": [
      {
        "incidentId": "uuid",
        "title": "Stripe DLQ depth increasing",
        "severity": "critical",
        "status": "open",
        "summary": "CRITICAL severity incident • detected via dlq_growth • 2 related events • affecting stripe-webhook, /api/payments/webhook • ~45 users impacted",
        "signals": [...],
        "recommendation": "immediate",
        "affectedServices": ["stripe-webhook"],
        "estimatedImpact": "High user impact • 1 service(s) affected"
      }
    ],
    "recommendations": {
      "immediate": ["uuid1"],
      "urgent": ["uuid2"],
      "monitor": ["uuid3"]
    },
    "context": {
      "totalIncidents": 5,
      "resolvedToday": 2,
      "averageResolutionTime": "2h 15m"
    }
  }
}
```

### List Events
```bash
GET /api/ops/events
```

**Query Parameters:**
- `incidentId` (optional): Filter events by incident ID
- `startTime` (optional): ISO timestamp for start of time range
- `endTime` (optional): ISO timestamp for end of time range
- `type` (optional): Filter by event type
- `severity` (optional): Filter by severity
- `limit` (optional): Maximum number of events to return (default: 100)

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "timestamp": "2025-12-07T13:00:00Z",
      "type": "health-check",
      "severity": "error",
      "title": "Latency threshold exceeded",
      "source": "health-check",
      "service": "/api/quote",
      "relatedIncidentIds": ["uuid"],
      "data": {...}
    }
  ],
  "count": 1
}
```

### Get Event
```bash
GET /api/ops/events/[id]
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "timestamp": "2025-12-07T13:00:00Z",
    "type": "health-check",
    "severity": "error",
    "title": "Latency threshold exceeded",
    ...
  }
}
```

## Recommendation Levels

IncidentsAI categorizes incidents into four priority levels:

1. **immediate**: Critical severity incidents requiring immediate attention
2. **urgent**: High severity incidents that need prompt action
3. **monitor**: Medium severity incidents to watch closely
4. **low-priority**: Low severity incidents that can be handled as capacity allows

## Usage Examples

### Get all open incidents
```bash
curl http://localhost:3000/api/ops/incidents/list?openOnly=true
```

### Get triage summary
```bash
curl http://localhost:3000/api/ops/incidents/ai-triage
```

### Get events for a specific incident
```bash
curl "http://localhost:3000/api/ops/events?incidentId=abc-123"
```

### Get critical incidents only
```bash
curl "http://localhost:3000/api/ops/incidents/list?severity=critical&openOnly=true"
```

## Data Storage

Incidents and events are stored in JSON files under `ops-state/`:
- `ops-state/incidents.json` - All incidents
- `ops-state/events.json` - All events

The store automatically creates these files and directories on first use.

## Integration

IncidentsAI integrates with:
- **Watchdog**: Can create incidents from health check failures
- **Monitoring**: Can ingest signals from various monitoring sources
- **Ops Actions**: Can link incidents to related ops actions
- **Events**: Provides context through related events

## Output Style

IncidentsAI follows a "What's important right now" mindset:
- **Short, structured summaries** - No verbose explanations
- **Actionable recommendations** - Clear priority levels
- **No blame** - Only clarity and facts
- **Context-aware** - Considers related events and signals









