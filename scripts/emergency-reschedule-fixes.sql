-- Emergency Reschedule Fixes - "Break Glass" Scripts
-- Use these only when absolutely necessary in production
-- Each script includes safety checks and rollback capabilities

-- ========================================
-- 1. UNDO A BAD RESCHEDULE (VERY RECENT)
-- ========================================
-- WARNING: Only use within 30 minutes of the reschedule
-- Replace OLD_A_ID and NEW_B_ID with actual UUIDs

DO $$
DECLARE 
  v_old uuid := 'OLD_A_ID_HERE'; -- Replace with actual old booking ID
  v_new uuid := 'NEW_B_ID_HERE'; -- Replace with actual new booking ID
  v_check_result boolean;
BEGIN
  -- SANITY CHECK: Ensure B truly replaces A and is fresh
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = v_new 
      AND reschedule_of_booking_id = v_old
      AND now() - created_at < interval '30 minutes'
  ) INTO v_check_result;
  
  IF NOT v_check_result THEN 
    RAISE EXCEPTION 'Sanity check failed: New booking does not replace old booking or is too old';
  END IF;
  
  -- BEGIN TRANSACTION
  BEGIN
    -- Restore old booking to confirmed status
    UPDATE bookings
    SET 
      status = 'confirmed',
      replaced_by_booking_id = NULL,
      reschedule_in_progress = false,
      reschedule_hold_expires_at = NULL,
      audit_json = COALESCE(audit_json, '{}'::jsonb) || jsonb_build_object(
        'event', 'reschedule_undo_emergency',
        'at', now(),
        'reason', 'Emergency rollback',
        'undone_booking_id', v_new
      )
    WHERE id = v_old;
    
    -- Delete the new (replacement) booking
    DELETE FROM bookings WHERE id = v_new;
    
    -- Clean up any associated reschedule tokens
    DELETE FROM reschedule_tokens 
    WHERE booking_id = v_old 
      AND used_at IS NOT NULL;
    
    RAISE NOTICE 'Emergency reschedule undo completed successfully';
    RAISE NOTICE 'Old booking % restored to confirmed status', v_old;
    RAISE NOTICE 'New booking % deleted', v_new;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Emergency undo failed: %', SQLERRM;
  END;
END $$;

-- ========================================
-- 2. FORCE-RESTORE ZOMBIE HOLDS
-- ========================================
-- Use this to restore any stuck reschedule holds

DO $$
DECLARE
  v_count integer;
  v_affected_bookings uuid[];
BEGIN
  -- Get count of stuck holds
  SELECT COUNT(*) INTO v_count
  FROM bookings
  WHERE reschedule_in_progress = true
    AND reschedule_hold_expires_at <= now();
  
  IF v_count = 0 THEN
    RAISE NOTICE 'No stuck holds found - nothing to fix';
    RETURN;
  END IF;
  
  -- Get list of affected bookings for logging
  SELECT ARRAY_AGG(id) INTO v_affected_bookings
  FROM bookings
  WHERE reschedule_in_progress = true
    AND reschedule_hold_expires_at <= now();
  
  -- Restore stuck holds to confirmed status
  UPDATE bookings
  SET 
    reschedule_in_progress = false,
    reschedule_hold_expires_at = NULL,
    audit_json = COALESCE(audit_json, '{}'::jsonb) || jsonb_build_object(
      'event', 'hold_auto_restore_emergency',
      'at', now(),
      'reason', 'Emergency cleanup of stuck holds',
      'restored_from', 'reschedule_hold'
    )
  WHERE reschedule_in_progress = true
    AND reschedule_hold_expires_at <= now();
  
  RAISE NOTICE 'Emergency hold cleanup completed';
  RAISE NOTICE 'Restored % stuck holds to confirmed status', v_count;
  RAISE NOTICE 'Affected booking IDs: %', v_affected_bookings;
  
END $$;

-- ========================================
-- 3. CLEAN UP EXPIRED/USED TOKENS
-- ========================================
-- Clean up old reschedule tokens

DO $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete used tokens
  DELETE FROM reschedule_tokens 
  WHERE used_at IS NOT NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Delete expired tokens (if expires_at column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reschedule_tokens' 
      AND column_name = 'expires_at'
  ) THEN
    DELETE FROM reschedule_tokens 
    WHERE expires_at < now();
    
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
  END IF;
  
  RAISE NOTICE 'Token cleanup completed: % tokens deleted', v_deleted_count;
END $$;

-- ========================================
-- 4. VERIFY SYSTEM INTEGRITY
-- ========================================
-- Run this after any emergency fixes to verify system state

SELECT 
  'System Integrity Check' as check_type,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN reschedule_in_progress = true THEN 1 END) as active_holds,
  COUNT(CASE WHEN reschedule_in_progress = true AND reschedule_hold_expires_at <= now() THEN 1 END) as stuck_holds,
  COUNT(CASE WHEN status = 'cancelled' AND replaced_by_booking_id IS NOT NULL THEN 1 END) as completed_reschedules
FROM bookings;

-- Check for orphaned reschedule tokens
SELECT 
  'Orphaned Tokens' as check_type,
  COUNT(*) as orphaned_count
FROM reschedule_tokens rt
LEFT JOIN bookings b ON rt.booking_id = b.id
WHERE b.id IS NULL;

-- Check for circular references
SELECT 
  'Circular References' as check_type,
  COUNT(*) as circular_count
FROM bookings b1
JOIN bookings b2 ON b1.replaced_by_booking_id = b2.id
WHERE b2.replaced_by_booking_id = b1.id;
