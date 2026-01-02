-- Migration: Fix uniqueness constraint on external_calendar_events
-- NOTE: Created per F-015.2 plan. DO NOT APPLY automatically.
-- This migration is idempotent: it verifies the correct constraint exists and fixes it if needed.

BEGIN;

-- Check if correct constraint already exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
    old_constraint_exists BOOLEAN;
BEGIN
    -- Check if the correct constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'external_calendar_events_provider_source_external_id_key'
        AND conrelid = 'external_calendar_events'::regclass
    ) INTO constraint_exists;

    -- Check if old incorrect constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'external_calendar_events_calendar_provider_external_event_id_key'
        AND conrelid = 'external_calendar_events'::regclass
    ) INTO old_constraint_exists;

    -- Only make changes if needed
    IF NOT constraint_exists THEN
        -- Drop old constraint if it exists
        IF old_constraint_exists THEN
            ALTER TABLE external_calendar_events
            DROP CONSTRAINT external_calendar_events_calendar_provider_external_event_id_key;
        END IF;

        -- Add correct unique constraint for provider-specific events
        ALTER TABLE external_calendar_events
        ADD CONSTRAINT external_calendar_events_provider_source_external_id_key
        UNIQUE(provider_id, calendar_provider, external_event_id);
    END IF;
END $$;

COMMIT;

