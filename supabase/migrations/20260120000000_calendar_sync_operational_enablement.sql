-- Migration: Calendar Sync Operational Enablement
-- Adds webhook support columns to external_calendar_connections
-- DO NOT APPLY AUTOMATICALLY - Manual execution required

BEGIN;

-- ========================================
-- 1. ADD WEBHOOK SUPPORT COLUMNS
-- ========================================

DO $$
BEGIN
    -- sync_needed flag (marks connection as needing sync after webhook)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'sync_needed'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN sync_needed BOOLEAN DEFAULT false;
    END IF;

    -- last_webhook_received_at timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'last_webhook_received_at'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN last_webhook_received_at TIMESTAMPTZ;
    END IF;

    -- webhook_dedupe_keys JSONB array for idempotency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'external_calendar_connections' 
        AND column_name = 'webhook_dedupe_keys'
    ) THEN
        ALTER TABLE external_calendar_connections
        ADD COLUMN webhook_dedupe_keys JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

-- Index for finding connections that need sync
CREATE INDEX IF NOT EXISTS idx_external_calendar_connections_sync_needed 
ON external_calendar_connections(sync_needed) 
WHERE sync_needed = true;

COMMIT;
