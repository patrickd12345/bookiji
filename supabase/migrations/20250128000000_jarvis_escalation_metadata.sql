-- Migration: Jarvis Escalation Metadata
-- Extends jarvis_incidents table with escalation tracking fields

BEGIN;

-- Add escalation metadata columns
ALTER TABLE jarvis_incidents
  ADD COLUMN IF NOT EXISTS first_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS notification_count integer NOT NULL DEFAULT 0;

-- Create index for escalation queries
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_escalation 
  ON jarvis_incidents(escalation_level, last_notified_at, acknowledged_at);

-- Create index for unacknowledged incidents
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_unacknowledged 
  ON jarvis_incidents(acknowledged_at, resolved) 
  WHERE acknowledged_at IS NULL AND resolved = false;

COMMIT;

