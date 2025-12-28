-- Migration: Jarvis Phase 5 - Seed Default Policy
-- Creates the default policy matching current OWNER_DEFAULT_V1 behavior
--
-- Note: Checksum will be computed by application on first access.
-- For now, we use a placeholder that will be validated/updated by the registry.

BEGIN;

-- Insert default policy (ACTIVE)
-- Checksum computed via: SHA256 of sorted JSON keys
INSERT INTO jarvis_policies (
  policy_id,
  name,
  version,
  status,
  created_by,
  policy_json,
  checksum,
  description
) VALUES (
  'OWNER_DEFAULT_V1',
  'Default Policy',
  '1.0.0',
  'ACTIVE',
  'system',
  '{
    "notification_cap": 5,
    "quiet_hours": {
      "start": "22:00",
      "end": "07:00",
      "timezone": "America/New_York"
    },
    "severity_rules": {
      "SEV-1": {
        "allowed_channels": ["sms"],
        "wake_during_quiet_hours": true,
        "max_silent_minutes": 120,
        "escalation_intervals_minutes": [15, 30, 60, 120]
      },
      "SEV-2": {
        "allowed_channels": ["sms"],
        "wake_during_quiet_hours": false,
        "max_silent_minutes": 120,
        "escalation_intervals_minutes": [15, 30, 60, 120]
      },
      "SEV-3": {
        "allowed_channels": [],
        "wake_during_quiet_hours": false,
        "max_silent_minutes": null,
        "escalation_intervals_minutes": []
      }
    }
  }'::jsonb,
  encode(digest('{
    "notification_cap": 5,
    "quiet_hours": {
      "start": "22:00",
      "end": "07:00",
      "timezone": "America/New_York"
    },
    "severity_rules": {
      "SEV-1": {
        "allowed_channels": ["sms"],
        "wake_during_quiet_hours": true,
        "max_silent_minutes": 120,
        "escalation_intervals_minutes": [15, 30, 60, 120]
      },
      "SEV-2": {
        "allowed_channels": ["sms"],
        "wake_during_quiet_hours": false,
        "max_silent_minutes": 120,
        "escalation_intervals_minutes": [15, 30, 60, 120]
      },
      "SEV-3": {
        "allowed_channels": [],
        "wake_during_quiet_hours": false,
        "max_silent_minutes": null,
        "escalation_intervals_minutes": []
      }
    }
  }', 'sha256'), 'hex'),
  'Default policy matching current OWNER_DEFAULT_V1 behavior'
) ON CONFLICT (policy_id) DO NOTHING;

COMMIT;
