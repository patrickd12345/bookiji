-- Migration: Add Slot Conflict Prevention (F-009)
-- Prevents overlapping availability slots for the same vendor
-- 
-- This migration adds:
-- 1. Exclusion constraint to prevent overlapping time ranges
-- 2. Version column for optimistic locking (future use)
-- 3. Indexes for performance
-- 4. Database function for atomic slot creation with conflict detection

-- Note: Supabase migrations handle transactions automatically, no BEGIN/COMMIT needed

-- 1. Ensure btree_gist extension is enabled (already enabled for bookings, but ensure it's here)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add version column for optimistic locking (as per design doc)
ALTER TABLE availability_slots
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 3. Add exclusion constraint to prevent overlapping slots
-- Note: This works alongside the existing UNIQUE constraint
-- UNIQUE prevents exact duplicates (same provider, same start, same end)
-- EXCLUDE prevents overlapping ranges (same provider, overlapping time ranges)
ALTER TABLE availability_slots
DROP CONSTRAINT IF EXISTS availability_slots_no_overlap;

ALTER TABLE availability_slots
ADD CONSTRAINT availability_slots_no_overlap
EXCLUDE USING gist (
  provider_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (is_available = true);

-- 4. Create index for conflict detection queries
-- Note: Table uses provider_id, not vendor_id
CREATE INDEX IF NOT EXISTS idx_availability_slots_provider_time 
ON availability_slots(provider_id, start_time, end_time)
WHERE is_available = true;

-- 5. Create atomic slot creation function with conflict detection
CREATE OR REPLACE FUNCTION create_slot_atomically(
  p_provider_id UUID,
  p_service_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_recurrence_rule JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  slot_id UUID,
  error_message TEXT,
  conflicts JSONB
) AS $$
DECLARE
  v_slot_id UUID;
  v_conflicts JSONB;
BEGIN
  
  -- Check for conflicts BEFORE attempting insert
  -- This provides better error messages than relying solely on constraint violation
  SELECT jsonb_agg(jsonb_build_object(
    'slot_id', id,
    'start_time', start_time,
    'end_time', end_time,
    'conflict_type', 'overlap'
  )) INTO v_conflicts
  FROM availability_slots
  WHERE provider_id = p_provider_id
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time)
    AND is_available = true;
  
  -- If conflicts exist, return them
  IF v_conflicts IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Conflicts detected'::TEXT, v_conflicts;
    RETURN;
  END IF;
  
  -- Create slot atomically
  -- Note: availability_slots table schema: id, provider_id, start_time, end_time, is_available, slot_type, created_at, updated_at
  -- service_id and recurrence_rule are not in the current schema (may be added later)
  -- p_service_id and p_recurrence_rule are accepted for API compatibility but not stored
  INSERT INTO availability_slots (
    provider_id, start_time, end_time, 
    is_available, version
  )
  VALUES (
    p_provider_id, p_start_time, p_end_time,
    true, 1
  )
  RETURNING id INTO v_slot_id;
  
  RETURN QUERY SELECT true, v_slot_id, NULL::TEXT, NULL::JSONB;
EXCEPTION
  WHEN exclusion_violation THEN
    -- Database constraint caught overlap (safety net)
    -- Try to get conflict details for better error message
    SELECT jsonb_agg(jsonb_build_object(
      'slot_id', id,
      'start_time', start_time,
      'end_time', end_time
    )) INTO v_conflicts
    FROM availability_slots
    WHERE provider_id = p_provider_id
      AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time)
      AND is_available = true;
    
    RETURN QUERY SELECT false, NULL::UUID, 'Slot overlap detected by database constraint'::TEXT, v_conflicts;
  WHEN unique_violation THEN
    -- Exact duplicate (same provider, same start, same end)
    RETURN QUERY SELECT false, NULL::UUID, 'Slot with identical time range already exists'::TEXT, NULL::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, SQLERRM::TEXT, NULL::JSONB;
END;
$$ LANGUAGE plpgsql;

-- Rollback plan:
-- If issues arise, run:
-- ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS availability_slots_no_overlap;
-- DROP FUNCTION IF EXISTS create_slot_atomically;
-- ALTER TABLE availability_slots DROP COLUMN IF EXISTS version;
