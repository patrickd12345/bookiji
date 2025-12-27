-- Migration: Jarvis Incident Tracking
-- Creates table for tracking incidents and preventing duplicate alerts

BEGIN;

-- Create jarvis_incidents table
CREATE TABLE IF NOT EXISTS jarvis_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL UNIQUE,
  incident_hash text NOT NULL,
  env text NOT NULL CHECK (env IN ('prod', 'staging', 'local')),
  severity text NOT NULL CHECK (severity IN ('SEV-1', 'SEV-2', 'SEV-3')),
  snapshot jsonb NOT NULL,
  assessment jsonb NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  replied boolean NOT NULL DEFAULT false,
  replied_at timestamptz,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_hash_sent ON jarvis_incidents(incident_hash, sent_at);
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_replied ON jarvis_incidents(replied, sent_at);
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_resolved ON jarvis_incidents(resolved, sent_at);
CREATE INDEX IF NOT EXISTS idx_jarvis_incidents_incident_id ON jarvis_incidents(incident_id);

-- RLS policies (only service role can access)
ALTER TABLE jarvis_incidents ENABLE ROW LEVEL SECURITY;

-- Service role has full access
GRANT ALL ON jarvis_incidents TO service_role;

-- No public access (Jarvis is internal only)
CREATE POLICY "Service role only"
  ON jarvis_incidents
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMIT;



