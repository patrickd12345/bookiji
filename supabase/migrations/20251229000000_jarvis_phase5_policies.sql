-- Migration: Jarvis Phase 5 - Policy Definition Layer
-- Creates tables for versioned policies and approval workflow
--
-- Policy lifecycle:
--   DRAFT -> (approval) -> APPROVED -> (activation) -> ACTIVE
--   ACTIVE -> (replacement) -> ARCHIVED
--
-- Only ONE ACTIVE policy at a time (enforced by unique constraint)

BEGIN;

-- Create jarvis_policies table
CREATE TABLE IF NOT EXISTS jarvis_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id text NOT NULL UNIQUE, -- Human-readable ID (e.g., "OWNER_DEFAULT_V1")
  name text NOT NULL,
  version text NOT NULL, -- Semver or integer version
  status text NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text, -- User ID or system identifier
  policy_json jsonb NOT NULL, -- Full policy configuration
  checksum text NOT NULL, -- SHA-256 hash of policy_json for integrity
  description text,
  created_at_version timestamptz NOT NULL DEFAULT now()
);

-- Policy JSON structure (enforced by application, documented here):
-- {
--   "notification_cap": 5,  -- MUST be <= 5 (invariant)
--   "quiet_hours": {
--     "start": "22:00",
--     "end": "07:00",
--     "timezone": "America/New_York"
--   },
--   "severity_rules": {
--     "SEV-1": {
--       "allowed_channels": ["sms"],
--       "wake_during_quiet_hours": true,
--       "max_silent_minutes": 120,
--       "escalation_intervals_minutes": [15, 30, 60, 120]
--     },
--     "SEV-2": {
--       "allowed_channels": ["sms"],
--       "wake_during_quiet_hours": false,
--       "max_silent_minutes": 120,
--       "escalation_intervals_minutes": [15, 30, 60, 120]
--     },
--     "SEV-3": {
--       "allowed_channels": [],
--       "wake_during_quiet_hours": false,
--       "max_silent_minutes": null,
--       "escalation_intervals_minutes": []
--     }
--   }
-- }

-- Create unique constraint: only one ACTIVE policy at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_jarvis_policies_one_active 
  ON jarvis_policies(status) 
  WHERE status = 'ACTIVE';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jarvis_policies_status ON jarvis_policies(status);
CREATE INDEX IF NOT EXISTS idx_jarvis_policies_policy_id ON jarvis_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_jarvis_policies_created_at ON jarvis_policies(created_at);

-- Create jarvis_policy_changes table for approval workflow
CREATE TABLE IF NOT EXISTS jarvis_policy_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id text NOT NULL UNIQUE, -- Human-readable change ID
  from_policy_id uuid REFERENCES jarvis_policies(id),
  to_policy_id uuid NOT NULL REFERENCES jarvis_policies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  status text NOT NULL CHECK (status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'APPLIED')),
  approved_at timestamptz,
  approved_by text,
  applied_at timestamptz,
  applied_by text,
  notes text,
  rejection_reason text
);

-- Create indexes for policy changes
CREATE INDEX IF NOT EXISTS idx_jarvis_policy_changes_status ON jarvis_policy_changes(status);
CREATE INDEX IF NOT EXISTS idx_jarvis_policy_changes_to_policy ON jarvis_policy_changes(to_policy_id);
CREATE INDEX IF NOT EXISTS idx_jarvis_policy_changes_created_at ON jarvis_policy_changes(created_at);

-- RLS policies (only service role can access)
ALTER TABLE jarvis_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_policy_changes ENABLE ROW LEVEL SECURITY;

-- Service role has full access
GRANT ALL ON jarvis_policies TO service_role;
GRANT ALL ON jarvis_policy_changes TO service_role;

-- No public access (Jarvis is internal only)
CREATE POLICY "Service role only policies"
  ON jarvis_policies
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role only policy changes"
  ON jarvis_policy_changes
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add policy tracking columns to jarvis_incident_events trace
-- (No schema change needed - trace is JSONB, but we'll enforce via application)

COMMIT;
