-- Calendar Migration Verification Queries
-- Use these queries to validate data integrity before and after migration application
-- Run these queries in the order presented

-- ========================================
-- PRE-MIGRATION VERIFICATION
-- ========================================

-- 1. Check if tables already exist
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('external_calendar_connections', 'external_calendar_events')
ORDER BY table_name;

-- 2. Check for existing data that might conflict
-- Check for existing external_calendar_events data
SELECT 
    COUNT(*) as existing_events_count,
    COUNT(DISTINCT provider_id) as unique_providers,
    COUNT(DISTINCT calendar_provider) as unique_providers_type
FROM external_calendar_events
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_events');

-- 3. Check for existing constraints that might conflict
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'external_calendar_events'::regclass
  AND conname IN (
    'external_calendar_events_calendar_provider_external_event_id_key',
    'external_calendar_events_provider_source_external_id_key'
  );

-- 4. Verify no active calendar sync operations
-- Check for connections with recent sync activity
SELECT 
    COUNT(*) as active_connections,
    COUNT(*) FILTER (WHERE sync_enabled = true) as enabled_connections,
    COUNT(*) FILTER (WHERE last_synced_at > NOW() - INTERVAL '1 hour') as recently_synced
FROM external_calendar_connections
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_calendar_connections');

-- ========================================
-- POST-MIGRATION VERIFICATION
-- ========================================

-- 1. Uniqueness validation
-- Check for duplicate (provider_id, calendar_provider, external_event_id)
-- Expected: 0 rows (no duplicates)
SELECT 
    provider_id, 
    calendar_provider, 
    external_event_id, 
    COUNT(*) as count
FROM external_calendar_events
GROUP BY provider_id, calendar_provider, external_event_id
HAVING COUNT(*) > 1;

-- 2. Booking↔Event mapping validation
-- Check for duplicate booking_id + calendar_provider mappings
-- Expected: 0 rows (no duplicates)
SELECT 
    booking_id, 
    calendar_provider, 
    COUNT(*) as count
FROM external_calendar_events
WHERE booking_id IS NOT NULL
GROUP BY booking_id, calendar_provider
HAVING COUNT(*) > 1;

-- 3. Foreign key integrity
-- Check for orphaned events (provider_id not in profiles)
-- Expected: 0 rows (no orphans)
SELECT 
    e.id, 
    e.provider_id,
    e.calendar_provider,
    e.external_event_id
FROM external_calendar_events e
LEFT JOIN profiles p ON e.provider_id = p.id
WHERE p.id IS NULL;

-- 4. Foreign key integrity for booking_id
-- Check for orphaned booking references
-- Expected: 0 rows (no orphans)
SELECT 
    e.id,
    e.booking_id,
    e.calendar_provider
FROM external_calendar_events e
WHERE e.booking_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = e.booking_id
  );

-- 5. Connection↔Event consistency
-- Check for events without corresponding connections
-- Note: This is informational - events can exist without connections during migration
SELECT DISTINCT 
    e.provider_id, 
    e.calendar_provider,
    COUNT(*) as event_count
FROM external_calendar_events e
LEFT JOIN external_calendar_connections c 
  ON e.provider_id = c.provider_id 
  AND e.calendar_provider = c.provider
WHERE c.id IS NULL
GROUP BY e.provider_id, e.calendar_provider;

-- 6. Constraint verification
-- Verify correct uniqueness constraint exists
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition,
    CASE 
        WHEN conname = 'external_calendar_events_provider_source_external_id_key' 
        THEN 'CORRECT'
        ELSE 'INCORRECT'
    END as status
FROM pg_constraint
WHERE conrelid = 'external_calendar_events'::regclass
  AND contype = 'u'
  AND conname LIKE '%external_calendar_events%';

-- 7. Index verification
-- Verify all required indexes exist
SELECT 
    indexname,
    indexdef,
    CASE 
        WHEN indexname IN (
            'idx_external_calendar_events_provider_id',
            'idx_external_calendar_events_provider',
            'idx_external_calendar_events_time_range',
            'idx_external_calendar_events_provider_time',
            'idx_external_calendar_events_checksum',
            'idx_external_calendar_events_booking_id',
            'idx_external_calendar_events_sync_status',
            'idx_external_calendar_events_booking_provider_unique'
        ) THEN 'REQUIRED'
        ELSE 'OPTIONAL'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'external_calendar_events'
ORDER BY indexname;

-- 8. Column verification
-- Verify all required columns exist with correct types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN (
            'id', 'provider_id', 'calendar_provider', 'external_event_id',
            'start_time', 'end_time', 'is_busy', 'checksum',
            'created_at', 'updated_at'
        ) THEN 'REQUIRED'
        WHEN column_name IN ('booking_id', 'sync_status', 'last_error', 'ical_uid', 'raw_payload')
        THEN 'OPTIONAL'
        ELSE 'UNKNOWN'
    END as column_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'external_calendar_events'
ORDER BY ordinal_position;

-- 9. Sync state columns verification (external_calendar_connections)
-- Verify sync state columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN (
            'sync_cursor', 'sync_token', 'last_synced_at',
            'error_count', 'last_error', 'backoff_until'
        ) THEN 'REQUIRED'
        ELSE 'OPTIONAL'
    END as column_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'external_calendar_connections'
  AND column_name IN (
    'sync_cursor', 'sync_token', 'last_synced_at',
    'error_count', 'last_error', 'backoff_until'
  )
ORDER BY column_name;

-- 10. Data consistency check
-- Verify end_time > start_time (constraint check)
SELECT 
    COUNT(*) as violations
FROM external_calendar_events
WHERE end_time <= start_time;

-- Expected: 0 violations

-- 11. Sync status validation
-- Verify sync_status values are valid
SELECT 
    sync_status,
    COUNT(*) as count
FROM external_calendar_events
WHERE sync_status IS NOT NULL
GROUP BY sync_status
HAVING sync_status NOT IN ('CREATED', 'UPDATED', 'CANCELLED', 'FAILED');

-- Expected: 0 rows (all sync_status values are valid)

-- ========================================
-- SUMMARY QUERY
-- ========================================

-- Run this after all verifications to get a summary
SELECT 
    'Tables' as category,
    COUNT(*) as count,
    STRING_AGG(table_name, ', ') as details
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('external_calendar_connections', 'external_calendar_events')
UNION ALL
SELECT 
    'Constraints' as category,
    COUNT(*) as count,
    STRING_AGG(conname, ', ') as details
FROM pg_constraint
WHERE conrelid = 'external_calendar_events'::regclass
  AND contype = 'u'
UNION ALL
SELECT 
    'Indexes' as category,
    COUNT(*) as count,
    STRING_AGG(indexname, ', ') as details
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'external_calendar_events'
UNION ALL
SELECT 
    'Events' as category,
    COUNT(*) as count,
    'Total events in table' as details
FROM external_calendar_events
UNION ALL
SELECT 
    'Connections' as category,
    COUNT(*) as count,
    'Total connections in table' as details
FROM external_calendar_connections;
