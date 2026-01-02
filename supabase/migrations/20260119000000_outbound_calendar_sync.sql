-- Migration: Outbound Calendar Sync (F-015.3)
-- Adds booking mapping and outbound sync state to external_calendar_events
-- DO NOT APPLY AUTOMATICALLY

BEGIN;

-- 1) Add booking_id, sync_status, last_error columns if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'external_calendar_events'
        AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE external_calendar_events
        ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'external_calendar_events'
        AND column_name = 'sync_status'
    ) THEN
        ALTER TABLE external_calendar_events
        ADD COLUMN sync_status TEXT CHECK (sync_status IN ('CREATED','UPDATED','CANCELLED','FAILED'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'external_calendar_events'
        AND column_name = 'last_error'
    ) THEN
        ALTER TABLE external_calendar_events
        ADD COLUMN last_error TEXT;
    END IF;
END $$;

-- 2) Create unique constraint to ensure one mapping per booking per provider (only when booking_id is set)
-- Note: PostgreSQL does not support partial unique constraints with expressions across NULLs easily,
-- so create a UNIQUE index for non-null booking_id and calendar_provider.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_external_calendar_events_booking_provider_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_external_calendar_events_booking_provider_unique
        ON external_calendar_events (booking_id, calendar_provider)
        WHERE booking_id IS NOT NULL;
    END IF;
END $$;

-- 3) Add indexes for lookup
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_external_calendar_events_booking_id'
    ) THEN
        CREATE INDEX idx_external_calendar_events_booking_id
        ON external_calendar_events (booking_id)
        WHERE booking_id IS NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_external_calendar_events_sync_status'
    ) THEN
        CREATE INDEX idx_external_calendar_events_sync_status
        ON external_calendar_events (sync_status)
        WHERE sync_status IS NOT NULL;
    END IF;
END $$;

COMMIT;

-- ROLLBACK PLAN
-- BEGIN;
-- ALTER TABLE external_calendar_events DROP CONSTRAINT IF EXISTS external_calendar_events_provider_source_external_id_key;
-- DROP INDEX IF EXISTS idx_external_calendar_events_booking_provider_unique;
-- ALTER TABLE external_calendar_events DROP COLUMN IF EXISTS booking_id;
-- ALTER TABLE external_calendar_events DROP COLUMN IF EXISTS sync_status;
-- ALTER TABLE external_calendar_events DROP COLUMN IF EXISTS last_error;
-- COMMIT;

