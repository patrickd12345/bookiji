-- Reschedule System Schema Verification
-- Run these queries in Supabase SQL Editor to verify setup

-- ========================================
-- 1. BOOKINGS COLUMNS VERIFICATION
-- ========================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN (
    'reschedule_in_progress',
    'reschedule_hold_expires_at',
    'reschedule_of_booking_id',
    'replaced_by_booking_id',
    'audit_json',
    'cancelled_by'
  )
ORDER BY column_name;

-- ========================================
-- 2. CONSTRAINTS & EXCLUSION VERIFICATION
-- ========================================
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
  AND conname IN ('reschedule_no_self_ref', 'no_overlap_per_vendor');

-- ========================================
-- 3. TOKEN TABLE STRUCTURE VERIFICATION
-- ========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'reschedule_tokens' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ========================================
-- 4. RPC FUNCTION SIGNATURE VERIFICATION
-- ========================================
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(p.oid) as function_signature,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p 
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND proname = 'reschedule_complete_tx';

-- ========================================
-- 5. INDICES VERIFICATION
-- ========================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('bookings', 'reschedule_tokens')
  AND indexname LIKE '%reschedule%'
ORDER BY tablename, indexname;

-- ========================================
-- 6. PERMISSIONS VERIFICATION
-- ========================================
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_name = 'reschedule_tokens'
  AND table_schema = 'public';

-- ========================================
-- 7. FUNCTION PERMISSIONS VERIFICATION
-- ========================================
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_routine_grants
WHERE routine_name = 'reschedule_complete_tx'
  AND routine_schema = 'public';
