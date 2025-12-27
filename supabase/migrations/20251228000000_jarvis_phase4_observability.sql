-- Migration: Jarvis Phase 4 Observability
-- Creates event storage and summary tables for observability
--
-- Event types (must match TypeScript IncidentEventType exactly):
--   - incident_created: Incident first detected
--   - escalation_decision_made: Escalation decision with trace (REQUIRED trace)
--   - notification_sent: SMS notification sent
--   - notification_suppressed: Notification suppressed (quiet hours, cap, etc.)
--   - acknowledged: Incident acknowledged by operator
--   - incident_resolved: Terminal state reached
--
-- Linkage: notification_sent/suppressed events link to escalation_decision_made
-- via temporal ordering (same incident_id, decision occurred_at <= notification occurred_at)

BEGIN;

-- Create jarvis_incident_events table for storing all incident-related events
CREATE TABLE IF NOT EXISTS jarvis_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN (
    'incident_created',
    'escalation_decision_made',
    'notification_sent',
    'notification_suppressed',
    'acknowledged',
    'incident_resolved'
  )),
  decision text CHECK (decision IN ('DO_NOT_NOTIFY', 'SEND_SILENT_SMS', 'SEND_LOUD_SMS', 'WAIT')),
  trace jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jarvis_incident_events_incident_id ON jarvis_incident_events(incident_id);
CREATE INDEX IF NOT EXISTS idx_jarvis_incident_events_occurred_at ON jarvis_incident_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_jarvis_incident_events_type ON jarvis_incident_events(event_type);
CREATE INDEX IF NOT EXISTS idx_jarvis_incident_events_incident_type ON jarvis_incident_events(incident_id, event_type);

-- Create jarvis_incident_summary table for post-incident summaries
CREATE TABLE IF NOT EXISTS jarvis_incident_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL UNIQUE,
  severity text NOT NULL CHECK (severity IN ('SEV-1', 'SEV-2', 'SEV-3')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_ms bigint NOT NULL,
  notifications_sent integer NOT NULL DEFAULT 0,
  notifications_suppressed integer NOT NULL DEFAULT 0,
  acknowledged_at timestamptz,
  time_to_ack_ms bigint,
  terminal_state text NOT NULL,
  top_decision_rules text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for summary queries
CREATE INDEX IF NOT EXISTS idx_jarvis_incident_summary_incident_id ON jarvis_incident_summary(incident_id);
CREATE INDEX IF NOT EXISTS idx_jarvis_incident_summary_ended_at ON jarvis_incident_summary(ended_at);

-- Create view for incident timeline
CREATE OR REPLACE VIEW jarvis_incident_timeline AS
SELECT 
  e.incident_id,
  e.occurred_at,
  e.event_type,
  e.decision,
  e.trace,
  jsonb_build_object(
    'severity', i.severity,
    'quiet_hours', CASE WHEN e.trace IS NOT NULL THEN (e.trace->>'quiet_hours')::boolean ELSE NULL END,
    'notification_count', CASE WHEN e.trace IS NOT NULL THEN (e.trace->>'notifications_sent')::int ELSE NULL END,
    'cap', CASE WHEN e.trace IS NOT NULL THEN (e.trace->>'cap')::int ELSE NULL END,
    'channel', e.metadata->>'channel',
    'rule_fired', CASE WHEN e.trace IS NOT NULL THEN e.trace->>'rule_fired' ELSE NULL END,
    'reason', e.metadata->>'reason',
    'terminal_state', e.metadata->>'terminal_state'
  ) as metadata
FROM jarvis_incident_events e
LEFT JOIN jarvis_incidents i ON e.incident_id = i.incident_id
ORDER BY e.incident_id, e.occurred_at;

-- RLS policies (only service role can access)
ALTER TABLE jarvis_incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_incident_summary ENABLE ROW LEVEL SECURITY;

-- Service role has full access
GRANT ALL ON jarvis_incident_events TO service_role;
GRANT ALL ON jarvis_incident_summary TO service_role;

-- No public access (Jarvis is internal only)
CREATE POLICY "Service role only events"
  ON jarvis_incident_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role only summary"
  ON jarvis_incident_summary
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMIT;
