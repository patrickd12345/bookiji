# Session Output Requirements

## Mandatory Outputs

Each session MUST generate:

### 1. Session Script Artifact
- Executable script file (`.mjs`)
- Contains all scenario logic
- Records observations in real-time
- Saves structured data on completion

### 2. Structured Observations JSON
- File: `{session-id}-observations.json`
- Contains:
  - Session metadata (ID, type, timestamps, duration)
  - All observations (timestamped, categorized)
  - Findings summary
  - Raw observation data

### 3. Markdown Report
- File: `{session-id}-report.md`
- Contains:
  - Executive summary
  - Observations breakdown
  - Detailed findings
  - Unanswered questions
  - What cannot yet be verified

## Observation Categories

### Failures
- Recorded when requests fail
- Includes: error type, status code, latency, context

### Non-Failures
- Recorded when requests succeed
- Includes: status code, latency, response size

### Silences
- Recorded when incidents are suppressed
- Includes: reason for suppression, timing

### Surprises
- Recorded when unexpected behavior occurs
- Includes: what was expected, what happened, context

## Consolidated Output

The master runner generates:

### Consolidated Findings JSON
- File: `consolidated-findings-{timestamp}.json`
- Contains:
  - All session summaries
  - Consolidated findings
  - Unanswered questions (all sessions)
  - What cannot yet be verified (all sessions)

### Consolidated Report
- File: `consolidated-findings-{timestamp}.md`
- Contains:
  - Executive summary
  - Session summaries
  - Consolidated findings
  - All unanswered questions
  - All unverifiable items
  - Next steps

## Output Format Standards

### JSON Structure
```json
{
  "session_id": "string",
  "session_type": "string",
  "start_time": "ISO8601",
  "end_time": "ISO8601",
  "duration_ms": "number",
  "observations": [
    {
      "timestamp": "ISO8601",
      "elapsed_ms": "number",
      "phase": "string",
      "event": "string",
      "data": {}
    }
  ],
  "findings": {
    "total_observations": "number",
    "incident_creation_observed": "boolean",
    "incident_suppression_observed": "boolean",
    "errors_observed": "number",
    "silences_observed": "number"
  }
}
```

### Markdown Structure
```markdown
# Session Title Report

**Session ID**: {id}
**Start Time**: {time}
**End Time**: {time}
**Duration**: {duration}s

## Executive Summary
{summary}

## Observations
{observations}

## Detailed Findings
{findings}

## Unanswered Questions
{questions}

## What Cannot Yet Be Verified
{unverifiable}

## Raw Observations
{reference to JSON}
```

## Do NOT Include

- ❌ Interpretations as "good" or "bad"
- ❌ Recommendations for fixes
- ❌ Suggestions for improvements
- ❌ Code changes
- ❌ Guardrails
- ❌ Retry logic
- ❌ Invariant modifications

## DO Include

- ✅ Raw observations
- ✅ Timestamps
- ✅ Event types
- ✅ Context data
- ✅ Failures
- ✅ Non-failures
- ✅ Silences
- ✅ Surprises
- ✅ Questions
- ✅ Unverifiable items

## Quality Checklist

Before considering a session complete:

- [ ] Session script executed successfully
- [ ] Observations JSON file created
- [ ] Markdown report generated
- [ ] All observations timestamped
- [ ] Failures recorded
- [ ] Non-failures recorded
- [ ] Silences recorded
- [ ] Surprises recorded
- [ ] Unanswered questions listed
- [ ] Unverifiable items listed
- [ ] No interpretations included
- [ ] No recommendations included










