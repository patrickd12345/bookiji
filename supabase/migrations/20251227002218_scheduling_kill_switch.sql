-- Migration: Scheduling Kill Switch
-- Creates system_flags table for operational kill switches

BEGIN;

-- Create system_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_flags (
  key text PRIMARY KEY,
  value boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL REFERENCES auth.users(id),
  reason text NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_flags_key ON system_flags(key);

-- Seed initial value: scheduling enabled by default
INSERT INTO system_flags (key, value, reason)
VALUES ('scheduling_enabled', true, 'Initial state: scheduling enabled')
ON CONFLICT (key) DO NOTHING;

-- Add RLS policies
ALTER TABLE system_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can read system flags
CREATE POLICY "Admins can read system flags"
  ON system_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update system flags
CREATE POLICY "Admins can update system flags"
  ON system_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant service role full access (for server-side operations)
GRANT ALL ON system_flags TO service_role;

COMMIT;





