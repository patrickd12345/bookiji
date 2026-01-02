-- Migration: Calendar Sync Foundations (F-015, Build Step 1)
-- Creates tables and columns needed for calendar sync foundation layer
-- 
-- This migration:
-- 1. Creates external_calendar_connections table (if missing)
-- 2. Adds sync state columns to external_calendar_connections
-- 3. Creates external_calendar_events table (events mirror for sync state)
-- 4. Creates necessary indexes
--
-- Per RECONCILIATION.md:
-- - Uses provider_id (not vendor_id)
-- - Extends existing storage (no parallel systems)
-- - Keeps plaintext token storage (encryption deferred)

BEGIN;

-- ========================================
-- 1. CREATE external_calendar_connections TABLE
-- ========================================
-- This table stores OAuth connections to external calendars (Google, Microsoft)
-- Referenced in production code but missing from migrations

CREATE TABLE IF NOT EXISTS external_calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
    provider_user_id TEXT, -- External system's user ID
    provider_calendar_id TEXT NOT NULL,
    provider_email TEXT,
    access_token TEXT NOT NULL, -- Plaintext per RECONCILIATION.md
    refresh_token TEXT NOT NULL, -- Plaintext per RECONCILIATION.md
    token_expiry TIMESTAMPTZ NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    last_synced TIMESTAMPTZ, -- Legacy name, kept for compatibility
    sync_from_date TIMESTAMPTZ,
    sync_frequency_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id, provider)
);

-- ========================================
-- 2. ADD SYNC STATE COLUMNS
-- ========================================
-- Add columns for tracking sync progress, errors, and backoff

DO $$
BEGIN
    -- Sync cursor for incremental sync
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'sync_cursor'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN sync_cursor TEXT;
    END IF;

    -- Sync token from provider (e.g., Google syncToken)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'sync_token'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN sync_token TEXT;
    END IF;

    -- Last synced timestamp (prefer this over last_synced)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN last_synced_at TIMESTAMPTZ;
    END IF;

    -- Error tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'error_count'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN error_count INTEGER DEFAULT 0;
    END IF;

    -- Last error details (JSONB for structured error info)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'last_error'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN last_error JSONB;
    END IF;

    -- Backoff until timestamp (for rate limiting)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'backoff_until'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN backoff_until TIMESTAMPTZ;
    END IF;
END $$;

-- ========================================
-- 3. CREATE external_calendar_events TABLE
-- ========================================
-- Events mirror table for tracking external calendar events during sync
-- This is separate from booking->event mapping (which goes on bookings table per RECONCILIATION.md)

CREATE TABLE IF NOT EXISTS external_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    calendar_provider TEXT NOT NULL CHECK (calendar_provider IN ('google', 'microsoft')),
    external_event_id TEXT NOT NULL,
    ical_uid TEXT, -- Stable identifier for outbound sync (RFC 5545 UID)
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_busy BOOLEAN NOT NULL,
    checksum TEXT NOT NULL, -- Deterministic hash for change detection
    raw_payload JSONB, -- Optional provider-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(calendar_provider, external_event_id),
    CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- ========================================
-- 4. CREATE INDEXES
-- ========================================

-- Indexes for external_calendar_connections
CREATE INDEX IF NOT EXISTS idx_external_calendar_connections_provider_id 
ON external_calendar_connections(provider_id);

CREATE INDEX IF NOT EXISTS idx_external_calendar_connections_provider 
ON external_calendar_connections(provider);

CREATE INDEX IF NOT EXISTS idx_external_calendar_connections_sync_enabled 
ON external_calendar_connections(sync_enabled) 
WHERE sync_enabled = true;

CREATE INDEX IF NOT EXISTS idx_external_calendar_connections_last_synced_at 
ON external_calendar_connections(last_synced_at) 
WHERE last_synced_at IS NOT NULL;

-- Indexes for external_calendar_events
CREATE INDEX IF NOT EXISTS idx_external_calendar_events_provider_id 
ON external_calendar_events(provider_id);

CREATE INDEX IF NOT EXISTS idx_external_calendar_events_provider 
ON external_calendar_events(calendar_provider);

CREATE INDEX IF NOT EXISTS idx_external_calendar_events_time_range 
ON external_calendar_events(provider_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_external_calendar_events_provider_time 
ON external_calendar_events(provider_id, calendar_provider);

CREATE INDEX IF NOT EXISTS idx_external_calendar_events_checksum 
ON external_calendar_events(checksum);

-- ========================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ========================================

-- Function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_external_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for external_calendar_connections
DROP TRIGGER IF EXISTS trigger_external_calendar_connections_updated_at ON external_calendar_connections;
CREATE TRIGGER trigger_external_calendar_connections_updated_at
    BEFORE UPDATE ON external_calendar_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_external_calendar_updated_at();

-- Trigger for external_calendar_events
DROP TRIGGER IF EXISTS trigger_external_calendar_events_updated_at ON external_calendar_events;
CREATE TRIGGER trigger_external_calendar_events_updated_at
    BEFORE UPDATE ON external_calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_external_calendar_updated_at();

COMMIT;

-- ========================================
-- ROLLBACK PLAN
-- ========================================
-- To rollback this migration:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_external_calendar_events_updated_at ON external_calendar_events;
-- DROP TRIGGER IF EXISTS trigger_external_calendar_connections_updated_at ON external_calendar_connections;
-- DROP FUNCTION IF EXISTS update_external_calendar_updated_at();
-- DROP TABLE IF EXISTS external_calendar_events CASCADE;
-- 
-- -- Remove sync state columns (if needed)
-- ALTER TABLE external_calendar_connections 
-- DROP COLUMN IF EXISTS backoff_until,
-- DROP COLUMN IF EXISTS last_error,
-- DROP COLUMN IF EXISTS error_count,
-- DROP COLUMN IF EXISTS last_synced_at,
-- DROP COLUMN IF EXISTS sync_token,
-- DROP COLUMN IF EXISTS sync_cursor;
--
-- -- Note: We do NOT drop external_calendar_connections table as it may have data
-- -- and is referenced in production code. Only drop if absolutely necessary.
-- -- DROP TABLE IF EXISTS external_calendar_connections CASCADE;
--
-- COMMIT;
