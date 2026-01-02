-- Calendar Migration Rollback Scripts
-- Use these scripts to rollback migrations in reverse order
-- IMPORTANT: Only run these if rollback is necessary. Review conditions first.

-- ========================================
-- ROLLBACK MIGRATION 3: Outbound Calendar Sync
-- Migration: 20260119000000_outbound_calendar_sync.sql
-- ========================================
-- Conditions for Rollback:
-- - If migrations #1 or #2 are rolled back (dependency)
-- - If outbound sync columns cause application errors
-- - If integration tests fail after this migration

BEGIN;

-- Drop indexes created by this migration
DROP INDEX IF EXISTS idx_external_calendar_events_sync_status;
DROP INDEX IF EXISTS idx_external_calendar_events_booking_id;
DROP INDEX IF EXISTS idx_external_calendar_events_booking_provider_unique;

-- Drop columns added by this migration
ALTER TABLE external_calendar_events
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS sync_status,
  DROP COLUMN IF EXISTS booking_id;

COMMIT;

-- Verification after rollback
-- Run these queries to verify rollback:
-- SELECT column_name FROM information_schema.columns 
--   WHERE table_name = 'external_calendar_events' 
--   AND column_name IN ('booking_id', 'sync_status', 'last_error');
-- Expected: 0 rows

-- SELECT indexname FROM pg_indexes 
--   WHERE tablename = 'external_calendar_events' 
--   AND indexname LIKE '%booking%' OR indexname LIKE '%sync_status%';
-- Expected: 0 rows

-- ========================================
-- ROLLBACK MIGRATION 2: Uniqueness Fix
-- Migration: 20260118000000_fix_external_calendar_events_uniqueness.sql
-- ========================================
-- Conditions for Rollback:
-- - If migration #1 is rolled back (dependency)
-- - If uniqueness constraint causes application errors
-- - If data integrity issues discovered

BEGIN;

-- Drop the correct constraint
ALTER TABLE external_calendar_events
  DROP CONSTRAINT IF EXISTS external_calendar_events_provider_source_external_id_key;

-- Restore old constraint (if needed for backward compatibility)
-- WARNING: This restores the incorrect constraint that doesn't include provider_id
-- Only use if absolutely necessary for backward compatibility
-- ALTER TABLE external_calendar_events
--   ADD CONSTRAINT external_calendar_events_calendar_provider_external_event_id_key
--   UNIQUE(calendar_provider, external_event_id);

COMMIT;

-- Verification after rollback
-- Run these queries to verify rollback:
-- SELECT conname FROM pg_constraint 
--   WHERE conrelid = 'external_calendar_events'::regclass 
--   AND conname = 'external_calendar_events_provider_source_external_id_key';
-- Expected: 0 rows

-- ========================================
-- ROLLBACK MIGRATION 1: Calendar Sync Foundations
-- Migration: 20260117000000_calendar_sync_foundations.sql
-- ========================================
-- Conditions for Rollback:
-- - Constraint violations during application
-- - Test failures after application
-- - Data integrity issues discovered
-- - Critical errors in table creation

-- WARNING: This is a destructive rollback that will:
-- - Drop the external_calendar_events table (all data will be lost)
-- - Remove sync state columns from external_calendar_connections
-- - Drop triggers and functions

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_external_calendar_events_updated_at ON external_calendar_events;
DROP TRIGGER IF EXISTS trigger_external_calendar_connections_updated_at ON external_calendar_connections;

-- Drop function
DROP FUNCTION IF EXISTS update_external_calendar_updated_at();

-- Drop external_calendar_events table (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS external_calendar_events CASCADE;

-- Remove sync state columns from external_calendar_connections
-- Note: We do NOT drop the external_calendar_connections table itself
-- as it may have data and is referenced in production code
ALTER TABLE external_calendar_connections 
  DROP COLUMN IF EXISTS backoff_until,
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS error_count,
  DROP COLUMN IF EXISTS last_synced_at,
  DROP COLUMN IF EXISTS sync_token,
  DROP COLUMN IF EXISTS sync_cursor;

-- Drop indexes created by this migration (if they still exist)
DROP INDEX IF EXISTS idx_external_calendar_events_provider_id;
DROP INDEX IF EXISTS idx_external_calendar_events_provider;
DROP INDEX IF EXISTS idx_external_calendar_events_time_range;
DROP INDEX IF EXISTS idx_external_calendar_events_provider_time;
DROP INDEX IF EXISTS idx_external_calendar_events_checksum;

COMMIT;

-- Verification after rollback
-- Run these queries to verify rollback:
-- SELECT table_name FROM information_schema.tables 
--   WHERE table_name = 'external_calendar_events';
-- Expected: 0 rows

-- SELECT column_name FROM information_schema.columns 
--   WHERE table_name = 'external_calendar_connections' 
--   AND column_name IN ('sync_cursor', 'sync_token', 'last_synced_at', 'error_count', 'last_error', 'backoff_until');
-- Expected: 0 rows

-- ========================================
-- COMPLETE ROLLBACK (All Migrations)
-- ========================================
-- Use this only if you need to rollback all three migrations at once
-- This executes rollbacks in reverse order (3 -> 2 -> 1)

BEGIN;

-- Rollback Migration 3
DROP INDEX IF EXISTS idx_external_calendar_events_sync_status;
DROP INDEX IF EXISTS idx_external_calendar_events_booking_id;
DROP INDEX IF EXISTS idx_external_calendar_events_booking_provider_unique;
ALTER TABLE external_calendar_events
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS sync_status,
  DROP COLUMN IF EXISTS booking_id;

-- Rollback Migration 2
ALTER TABLE external_calendar_events
  DROP CONSTRAINT IF EXISTS external_calendar_events_provider_source_external_id_key;

-- Rollback Migration 1
DROP TRIGGER IF EXISTS trigger_external_calendar_events_updated_at ON external_calendar_events;
DROP TRIGGER IF EXISTS trigger_external_calendar_connections_updated_at ON external_calendar_connections;
DROP FUNCTION IF EXISTS update_external_calendar_updated_at();
DROP TABLE IF EXISTS external_calendar_events CASCADE;
ALTER TABLE external_calendar_connections 
  DROP COLUMN IF EXISTS backoff_until,
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS error_count,
  DROP COLUMN IF EXISTS last_synced_at,
  DROP COLUMN IF EXISTS sync_token,
  DROP COLUMN IF EXISTS sync_cursor;
DROP INDEX IF EXISTS idx_external_calendar_events_provider_id;
DROP INDEX IF EXISTS idx_external_calendar_events_provider;
DROP INDEX IF EXISTS idx_external_calendar_events_time_range;
DROP INDEX IF EXISTS idx_external_calendar_events_provider_time;
DROP INDEX IF EXISTS idx_external_calendar_events_checksum;

COMMIT;

-- ========================================
-- COMPENSATING STEPS (If Rollback Not Possible)
-- ========================================
-- If data has already been modified and rollback would cause data loss,
-- use these compensating steps instead:

-- 1. Export affected data before rollback
-- CREATE TABLE external_calendar_events_backup AS 
--   SELECT * FROM external_calendar_events;

-- 2. Identify affected records
-- SELECT 
--   provider_id,
--   calendar_provider,
--   COUNT(*) as event_count
-- FROM external_calendar_events
-- GROUP BY provider_id, calendar_provider;

-- 3. Create restoration script (example)
-- -- Restore from backup if needed
-- INSERT INTO external_calendar_events 
-- SELECT * FROM external_calendar_events_backup
-- WHERE NOT EXISTS (
--   SELECT 1 FROM external_calendar_events e 
--   WHERE e.id = external_calendar_events_backup.id
-- );

-- 4. Estimate downtime
-- - Migration rollback: ~5-10 minutes
-- - Data restoration: ~10-30 minutes (depending on data volume)
-- - Verification: ~5 minutes
-- Total estimated downtime: 20-45 minutes

-- ========================================
-- ROLLBACK VERIFICATION CHECKLIST
-- ========================================
-- After executing rollback, verify:

-- 1. Tables
--    - external_calendar_events should not exist (if migration 1 rolled back)
--    - external_calendar_connections should still exist (not dropped)

-- 2. Columns
--    - Sync state columns removed from external_calendar_connections
--    - Outbound sync columns removed from external_calendar_events (if migration 3 rolled back)

-- 3. Constraints
--    - Uniqueness constraint removed (if migration 2 rolled back)

-- 4. Indexes
--    - All migration-created indexes removed

-- 5. Functions and Triggers
--    - update_external_calendar_updated_at() function removed
--    - All triggers removed

-- 6. Data Integrity
--    - No orphaned references
--    - No constraint violations
--    - Application can start without errors
