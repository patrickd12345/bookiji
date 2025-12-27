# Jarvis - Incident Commander (3AM Mode)

**Version:** v0  
**Status:** Active  
**Last Updated:** 2025-01-27

## Overview

Jarvis is Bookiji's incident commander system that stands watch while you sleep. At 3AM, when Bookiji is on fire, Jarvis:

1. **Detects** incidents from system state
2. **Assesses** severity and impact using LLM reasoning
3. **Notifies** you via SMS with clear options
4. **Executes** pre-authorized actions based on your reply
5. **Respects** your sleep and escalation preferences

This is not a chatbot. This is an operational nervous system with a voice.

## Architecture

### Core Components

```
┌─────────────────────────────────────────┐
│     Incident Snapshot Collector         │
│  (Health checks, kill switches, etc.)  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        LLM Assessment Layer             │
│  (Reasoning over system state)        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         SMS Handler                     │
│  (Outbound alerts, inbound parsing)    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Action Execution Matrix           │
│  (Pre-authorized safe actions)         │
└─────────────────────────────────────────────────┘
```

### Key Files

- `src/lib/jarvis/types.ts` - Type definitions
- `src/lib/jarvis/incidentSnapshot.ts` - System state collection
- `src/lib/jarvis/llmAssessment.ts` - LLM reasoning layer
- `src/lib/jarvis/smsHandler.ts` - SMS outbound/inbound
- `src/lib/jarvis/actionMatrix.ts` - Pre-authorized actions
- `src/lib/jarvis/orchestrator.ts` - Main coordination logic
- `src/app/api/jarvis/detect/route.ts` - Detection endpoint
- `src/app/api/jarvis/reply/route.ts` - Reply handler
- `src/app/api/cron/jarvis-monitor/route.ts` - Monitoring cron

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# Required
JARVIS_OWNER_PHONE=+1234567890  # Your phone number

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=+1234567890  # Your Twilio number

# LLM Provider (Groq or OpenAI)
GROQ_API_KEY=your_groq_key  # Fast, recommended
# OR
OPENAI_API_KEY=your_openai_key

# Cron Secret (for Vercel Cron)
VERCEL_CRON_SECRET=your_secret
```

### 2. Configure Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/jarvis-monitor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Or use external cron service to call `/api/cron/jarvis-monitor` every 5 minutes.

### 3. Test Detection

```bash
# Manual trigger
curl -X POST http://localhost:3000/api/jarvis/detect \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
```

## Usage

### Incident Detection Flow

1. **Cron job runs** every 5 minutes
2. **Jarvis collects** incident snapshot:
   - Health check status
   - Kill switch state
   - Error rates
   - Invariant violations
   - Webhook backlog
   - Booking failures

3. **Jarvis assesses** with LLM:
   - What's broken
   - What's safe
   - Severity (SEV-1/SEV-2/SEV-3)
   - Recommended actions

4. **Jarvis sends SMS** if SEV-1 or SEV-2 in prod/staging:
   ```
   🚨 Bookiji SEV-1 (prod)
   
   What: Booking confirmations failing
   Impact: New bookings blocked
   Safe: Existing bookings & payments
   Actions taken: Scheduling paused
   
   Recommended:
   A) Monitor 15 min
   B) Roll back deploy
   C) Disable payments only
   D) Wake me only if worse
   
   No reply: Monitor for 15 minutes, then re-assess
   
   Reply with letters (e.g. A, B+C) or natural language.
   ```

### Reply Processing

You can reply in multiple formats:

**Multiple Choice:**
- `A` - Execute option A
- `B+C` - Execute B and C
- `A and B` - Execute A and B

**Natural Language:**
- `A. Baby woke up. Don't wake me unless bookings are at risk.`
- `Hold. Don't alert me again unless severity increases.`
- `Do C but only if Stripe confirms backlog cleared.`

Jarvis will:
1. Parse your reply (LLM + regex fallback)
2. Execute pre-authorized actions
3. Note constraints (e.g., "don't wake me")
4. Send confirmation SMS

### Pre-Authorized Actions

Jarvis can execute these without waking you:

**Allowed:**
- ✅ Enable/disable scheduling kill switch
- ✅ Capture forensic snapshots
- ✅ Monitor and wait

**Forbidden (requires coffee):**
- ❌ Migrations
- ❌ Deploys
- ❌ Schema changes
- ❌ Data deletion
- ❌ Disabling audits

## API Endpoints

### POST /api/jarvis/detect

Manually trigger incident detection.

**Request:**
```json
{
  "phone": "+1234567890"  // Optional, uses JARVIS_OWNER_PHONE if omitted
}
```

**Response:**
```json
{
  "success": true,
  "incident_id": "incident_1234567890",
  "snapshot_taken": true,
  "assessment_done": true,
  "sms_sent": true
}
```

### GET /api/jarvis/detect

Check if incident should trigger alert (without sending SMS).

**Response:**
```json
{
  "should_alert": true,
  "reason": "SEV-1 incident in prod",
  "snapshot": { ... }
}
```

### POST /api/jarvis/reply

Process SMS reply (called by Twilio webhook or manually).

**Request:**
```json
{
  "Body": "A. Don't wake me unless worse",
  "From": "+1234567890",
  "incident_id": "incident_1234567890",
  "env": "prod"
}
```

**Response:**
```json
{
  "success": true,
  "parsed": {
    "choices": ["A"],
    "constraints": ["no further alerts unless severity increases"],
    "confidence": "high"
  },
  "actions_executed": [
    {
      "action_id": "capture_snapshot",
      "success": true,
      "message": "Forensic snapshot captured"
    }
  ],
  "message": "✅ Jarvis received your reply..."
}
```

### GET /api/cron/jarvis-monitor

Cron endpoint for periodic monitoring.

**Headers:**
```
Authorization: Bearer <VERCEL_CRON_SECRET>
```

## Configuration

### Severity Thresholds

- **SEV-1**: Critical issues in prod (invariant violations, error spikes + booking failures)
- **SEV-2**: Degraded but not critical (error spikes, webhook backlog)
- **SEV-3**: Minor issues (no alert sent)

### Alert Rules

- Only SEV-1 and SEV-2 trigger alerts
- Local environment never alerts
- Kill switch already active + SEV-2 = no alert (monitoring)

### Sleep-Aware Escalation

Jarvis tracks:
- Last wake time
- Your availability constraints
- Severity drift

Rules:
- SEV-2 → no wake unless escalates
- SEV-1 → wake once, then wait
- Repeat alerts suppressed unless state changes

## Troubleshooting

### SMS Not Sending

1. Check `JARVIS_OWNER_PHONE` is set
2. Verify Twilio credentials
3. Check Twilio account balance
4. Review logs for errors

### LLM Assessment Failing

1. Check `GROQ_API_KEY` or `OPENAI_API_KEY`
2. Falls back to deterministic assessment if LLM unavailable
3. Review logs for API errors

### Actions Not Executing

1. Verify action is in allowed matrix
2. Check environment (some actions blocked in prod)
3. Review action execution logs

## Hardening Features

### Duplicate Suppression

Jarvis prevents pager storms by suppressing duplicate alerts:
- Generates incident hash from snapshot + assessment
- Checks if same incident was sent within last 45 minutes
- Prevents resending if incident state hasn't meaningfully changed
- Stored in `jarvis_incidents` table

### No-Reply Default Actions

If you don't reply within 15 minutes:
- Jarvis executes the first recommended action (usually "A")
- Sends follow-up SMS confirming what was done
- Logs action for audit trail
- Prevents incidents from hanging indefinitely

## Pre-Deploy Checklist

Before deploying Jarvis to production:

1. **Run pre-deploy check:**
   ```bash
   pnpm jarvis:pre-deploy
   ```

2. **Verify secrets:**
   - Only one LLM key set (GROQ or OPENAI, not both)
   - Twilio credentials configured
   - `JARVIS_OWNER_PHONE` set

3. **Apply migration:**
   ```bash
   supabase db push
   ```

4. **Test dry-run:**
   ```bash
   curl -X POST http://localhost:3000/api/jarvis/detect \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890"}'
   ```

## Phase 2A: Human-in-the-Loop SMS Commands

**Status:** Implemented  
**Last Updated:** 2025-01-27

### Overview

Jarvis Phase 2A enables direct SMS command execution. The owner can reply to incident alerts or send standalone commands via SMS.

### Key Features

- **SMS Reply Webhook**: `POST /api/jarvis/sms-reply`
- **Deterministic Intent Parser**: Recognizes explicit commands (ENABLE SCHEDULING, DISABLE SCHEDULING)
- **Action Registry**: Whitelist of executable actions (only scheduling kill switch for now)
- **Guard Rails**: Environment checks, sender verification, duplicate suppression
- **Feedback SMS**: Always replies with execution outcome
- **Audit Logging**: All actions logged for later querying

### Supported Commands

- `ENABLE SCHEDULING` / `TURN ON SCHEDULING` → Enables scheduling kill switch
- `DISABLE SCHEDULING` / `TURN OFF SCHEDULING` → Disables scheduling kill switch

### Security

- **Sender Verification**: Only `JARVIS_OWNER_PHONE` can execute commands
- **Twilio Signature**: Optional verification (can be disabled in dev)
- **Environment Guards**: Actions checked against environment allowlist
- **Action Registry**: No dynamic execution, only whitelisted actions

### Example Flow

1. Owner sends SMS: `DISABLE SCHEDULING`
2. Jarvis verifies sender phone matches owner
3. Parses intent (deterministic: finds DISABLE_SCHEDULING)
4. Checks guards (environment, action registry)
5. Executes action (reuses admin cockpit logic)
6. Sends feedback SMS: `✅ Action executed (PROD)\n\nScheduling disabled successfully`
7. Logs audit entry

### Files

- `src/app/api/jarvis/sms-reply/route.ts` - Webhook endpoint
- `src/lib/jarvis/intent/parseSmsIntent.ts` - Intent parser
- `src/lib/jarvis/actions/registry.ts` - Action registry
- `src/lib/jarvis/actions/disableScheduling.ts` - Disable action
- `src/lib/jarvis/actions/enableScheduling.ts` - Enable action
- `src/lib/jarvis/execution/executeWithGuards.ts` - Guard rails
- `src/lib/jarvis/feedback/sendFeedbackSMS.ts` - Feedback SMS
- `src/lib/jarvis/audit/auditLog.ts` - Audit logging

## Phase 2B: Human-in-the-Loop Playbooks

**Status:** Implemented  
**Last Updated:** 2025-01-27

### Overview

Jarvis Phase 2B enables multi-step response playbooks. Jarvis can propose a playbook, execute one step at a time, and require explicit SMS confirmation for each step.

### Key Features

- **Static Playbooks**: Versioned, predefined response plans (no LLM-generated plans)
- **One-Step Execution**: Only one step executes per SMS confirmation
- **State Tracking**: Playbook state persists across SMS messages
- **SMS Menu Rendering**: Clear step-by-step guidance via SMS
- **Full Integration**: Works with existing action registry and guard rails

### Playbook Commands

- `START <PLAYBOOK_ID>` - Begin a playbook (e.g., `START SCHEDULING_DEGRADED_V1`)
- `NEXT` - Execute next step in active playbook
- `SKIP` - Skip current step (if optional)
- `ABORT` - Cancel active playbook

### Available Playbooks

#### Scheduling Degraded Response (v1.0.0)

**ID:** `SCHEDULING_DEGRADED_V1`  
**Environments:** staging, prod  
**Steps:**
1. Disable scheduling to prevent further booking failures (required)
2. Re-enable scheduling after investigation (optional)

**Triggers:** `scheduling_degraded`, `booking_failures`, `error_rate_spike`

### Example Flow

1. Incident detected: Scheduling system degraded
2. Jarvis suggests playbook: `SCHEDULING_DEGRADED_V1`
3. Owner sends: `START SCHEDULING_DEGRADED_V1`
4. Jarvis responds with step 1 menu
5. Owner sends: `NEXT`
6. Jarvis executes step 1 (disables scheduling), sends confirmation
7. Owner sends: `NEXT`
8. Jarvis executes step 2 (re-enables scheduling), sends completion message

### Constraints

- **No Autonomous Execution**: Every step requires explicit SMS confirmation
- **No LLM Action Selection**: LLMs may explain risk but never select actions
- **Static Playbooks Only**: All playbooks must be explicitly defined in registry
- **One Step Per SMS**: Only one step executes per confirmation
- **Full Audit Trail**: All playbook actions logged

### State Persistence

Playbook state is stored in `jarvis_incidents` table:
- Current step index
- Steps executed
- Completion status
- Abort status

### Files

- `src/lib/jarvis/playbooks/types.ts` - Playbook type definitions
- `src/lib/jarvis/playbooks/registry.ts` - Playbook registry
- `src/lib/jarvis/playbooks/state.ts` - State management
- `src/lib/jarvis/playbooks/engine.ts` - Playbook engine
- `src/lib/jarvis/playbooks/smsMenu.ts` - SMS menu rendering

## Phase 2C: Read-Only Situation Awareness

**Status:** Implemented  
**Last Updated:** 2025-01-27

### Overview

Jarvis Phase 2C adds read-only situational awareness via SMS. The owner can query incident status, understand root causes, track changes, and see available commands—all without triggering any actions or state changes.

### Key Features

- **Read-Only Queries**: STATUS, WHY, CHANGES, HELP commands
- **No Side Effects**: Zero writes, zero actions, zero state changes
- **Deterministic Logic**: Severity and command availability computed from facts
- **LLM Summarization**: Optional LLM rephrasing (with deterministic fallback)
- **Full Audit Trail**: All queries logged for later analysis

### Supported Commands

#### STATUS

Returns current incident status:
- Incident type and affected subsystems
- Environment (local/staging/prod)
- Current severity (deterministic)
- Scheduling kill switch status
- Active playbook (if any)
- Time since incident started

**Example:**
```
STATUS — Bookiji (PROD)

Issue: Scheduling degraded
Severity: SEV-2
Since: 8 min ago

Scheduling: DISABLED
Bookings impacted: No
Payments impacted: No

Playbook: Not started
```

#### WHY

Explains incident root cause:
- What triggered the incident
- First signal vs latest signal
- Threshold crossed
- Calming signals (what did NOT happen)

**Example:**
```
WHY — Incident Root Cause

Triggered by: Error rate spike, Booking failures

First signal: API error rate exceeded threshold

Calming signals:
- Payments processing normally
- Safe components: payments, data_integrity
```

#### CHANGES

Shows what changed since last update:
- New errors vs resolved signals
- Whether situation is improving, stable, or worsening
- Timestamp of last material change

**Example:**
```
CHANGES — Since Last Update

New issues:
- Error rate spike started

Resolved:
- Booking failures resolved

Trend: improving
Last change: 2025-01-27T03:15:00Z
```

#### HELP

Lists all available commands for current state:
- Read-only commands (always available)
- Action commands (if allowed in environment)
- Playbook commands (if playbook exists)

**Example:**
```
HELP — Available Commands

Read-only:
- STATUS
- WHY
- CHANGES
- HELP

Actions:
- DISABLE_SCHEDULING: Disable Scheduling
- ENABLE_SCHEDULING: Enable Scheduling

Playbooks:
- START SCHEDULING_DEGRADED_V1: Scheduling Degraded Response
```

### Safety Guarantees

- **No Writes**: All queries are read-only from `jarvis_incidents` table
- **No Actions**: Status queries never trigger actions or playbooks
- **No State Changes**: Incident state remains unchanged
- **Deterministic Severity**: Computed from facts, not LLM inference
- **Command Availability**: Only valid commands are shown

### Architecture

#### Severity Computation

`computeSeverity()` uses rule-based logic:
- Invariant violations in prod → SEV-1
- Error spike + booking failures → SEV-1
- Active signals → SEV-2
- No signals → SEV-3

#### Command Availability

`computeAvailableCommands()` inspects:
- Current incident state
- Environment (prod/staging/local)
- Active playbook status
- Action registry allowlist

Never advertises unavailable commands.

#### LLM Summarization

LLMs are used ONLY for:
- Rephrasing facts into calm, clear language
- Improving readability at 3AM

LLMs NEVER:
- Infer state or risk
- Introduce new claims
- Determine severity
- Select actions

If LLM unavailable → deterministic fallback text.

### Files

- `src/lib/jarvis/status/getIncidentSnapshot.ts` - Read incident from DB
- `src/lib/jarvis/status/computeSeverity.ts` - Deterministic severity
- `src/lib/jarvis/status/computeAvailableCommands.ts` - Command availability
- `src/lib/jarvis/status/summarizeIncident.ts` - LLM summarization with fallback

### Example Flow

1. Incident detected, Jarvis sends SMS alert
2. Owner replies: `STATUS`
3. Jarvis responds with current status (read-only)
4. Owner replies: `WHY`
5. Jarvis explains root cause (read-only)
6. Owner replies: `CHANGES`
7. Jarvis shows what changed (read-only)
8. Owner replies: `HELP`
9. Jarvis lists available commands

No actions executed. No state changed. Pure information.

## Phase 3: Sleep-Aware Escalation & Attention Management

**Status:** Implemented  
**Last Updated:** 2025-01-27

### Overview

Jarvis Phase 3 adds sleep-aware escalation and attention management. Jarvis decides how loudly to notify, when, and how often based on incident severity, time of day, owner response, and explicit sleep preferences.

### Key Features

- **Sleep Policy**: Static, versioned quiet hours (22:00-07:00 default)
- **Escalation Decision Engine**: Deterministic logic (no LLM decisions)
- **Tone Profiles**: LLM-assisted phrasing (deterministic tone selection)
- **Escalation Tracking**: Metadata in `jarvis_incidents` table
- **ACK Command**: Freeze escalation with acknowledgment
- **Hard Caps**: Maximum notifications per incident to prevent spam

### Sleep Philosophy

Jarvis is not PagerDuty. Jarvis behaves like:
> "Someone competent watching the system for you, who only taps your shoulder when it truly matters."

If a human would hesitate to wake you — Jarvis must hesitate too.

### Escalation Rules

#### SEV-1 (Critical)
- **Always wakes** — even during quiet hours
- **Immediate notification** — no delay
- **Escalates every 15/30/60/120 minutes** if unacknowledged
- **Hard cap**: 5 notifications max per incident

#### SEV-2 (Degraded)
- **Respects quiet hours** — waits until 07:00 if incident starts at night
- **Immediate notification** — if not in quiet hours
- **Escalates silently** — during business hours
- **Escalates loudly** — after 2 hours of silence (even in quiet hours)
- **Hard cap**: 5 notifications max per incident

#### SEV-3 (Minor)
- **Never notifies** — informational only

### Escalation Intervals

Default policy (`OWNER_DEFAULT_V1`):
- First notification: Immediate (if allowed by sleep policy)
- Escalation 1: 15 minutes after first
- Escalation 2: 30 minutes after escalation 1
- Escalation 3: 60 minutes after escalation 2
- Escalation 4: 120 minutes after escalation 3
- Maximum: 5 total notifications per incident

### ACK Command

Owner can acknowledge incident to freeze escalation:
- `ACK` / `ACKNOWLEDGE` / `ACKNOWLEDGED`
- Marks incident as acknowledged
- Stops all escalation
- Jarvis switches to read-only mode
- Escalation resumes only if severity increases

### Tone Profiles

Jarvis selects tone deterministically, then optionally uses LLM for phrasing:

- **CALM_INFORMATIONAL**: First SEV-2 notification, updates
- **ATTENTION_NEEDED**: Escalations, SEV-1 updates
- **URGENT_WAKEUP**: SEV-1 during quiet hours, critical escalations

LLM prompt: "Rewrite in calm, respectful, low-panic tone. Do not add urgency."

### Safety Guarantees

- **No Autonomous Remediation**: Escalation only changes notification behavior
- **No New Execution Paths**: All actions still require explicit SMS commands
- **Deterministic Decisions**: No LLM deciding when to escalate
- **Hard Caps**: Never more than 5 SMS per incident
- **Quiet Hours Respected**: SEV-2 never wakes during quiet hours (unless 2+ hours silence)

### Example Flows

#### SEV-1 Incident at 3AM
1. Incident detected: SEV-1
2. Jarvis checks sleep policy: In quiet hours (22:00-07:00)
3. Decision: SEND_LOUD_SMS (SEV-1 can wake)
4. Owner receives: `🚨 Bookiji SEV-1 (PROD)...`
5. Owner replies: `ACK`
6. Escalation frozen

#### SEV-2 Incident at 3AM
1. Incident detected: SEV-2
2. Jarvis checks sleep policy: In quiet hours
3. Decision: WAIT until 07:00
4. At 07:00: SEND_SILENT_SMS
5. Owner receives calm notification after quiet hours

#### SEV-2 Escalation
1. SEV-2 incident, 30 minutes since last notification
2. Decision: SEND_SILENT_SMS (update)
3. Owner receives: `📋 Bookiji Update...`
4. If no response after 2 hours: SEND_LOUD_SMS (escalation)

### Files

- `src/lib/jarvis/escalation/sleepPolicy.ts` - Sleep policy model
- `src/lib/jarvis/escalation/decideNextAction.ts` - Escalation decision engine
- `src/lib/jarvis/escalation/toneProfiles.ts` - Tone selection and LLM phrasing
- `src/lib/jarvis/escalation/state.ts` - Escalation state management
- `src/lib/jarvis/escalation/orchestrator.ts` - Escalation checking logic
- `src/lib/jarvis/escalation/notifyWithEscalation.ts` - Escalation-aware notification

### Migration

Apply migration to add escalation metadata:
```bash
supabase db push
```

Migration: `20250128000000_jarvis_escalation_metadata.sql`

Adds columns:
- `first_notified_at`
- `last_notified_at`
- `escalation_level`
- `acknowledged_at`
- `notification_count`

## Future Enhancements

- [ ] Morning handoff report
- [ ] Multi-user escalation
- [ ] Integration with PagerDuty/Opsgenie
- [ ] Voice call escalation for SEV-1
- [ ] Incident timeline and replay
- [ ] Additional actions (beyond kill switch)

## References

- [Incident Response Best Practices](https://example.com)
- [Kill Switch Documentation](../invariants/admin-ops.md)
- [Health Check System](../maintenance/HEALTHAI_SYSTEM.md)

