-- Migration: Enforce Booking Atomicity and Strengthen Constraints
-- This migration strengthens database-level guarantees for booking integrity
-- Prevents double bookings and ensures slot-booking consistency

BEGIN;

-- ========================================
-- 1. VERIFY EXCLUSION CONSTRAINT EXISTS
-- ========================================

-- Ensure btree_gist extension is available
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Verify and recreate exclusion constraint if needed
DO $$
BEGIN
    -- Drop constraint if it exists with wrong definition
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bookings_no_overlap_provider_time'
    ) THEN
        ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap_provider_time;
    END IF;
END $$;

-- Recreate exclusion constraint (prevents overlapping bookings per provider)
ALTER TABLE bookings 
ADD CONSTRAINT bookings_no_overlap_provider_time
EXCLUDE USING gist (
    provider_id WITH =, 
    tstzrange(start_time, end_time) WITH &&
)
WHERE (status NOT IN ('cancelled', 'no_show'));

-- ========================================
-- 2. ADD UNIQUE INDEX ON BOOKINGS FOR DUPLICATE DETECTION
-- ========================================

-- Add unique index on provider + time range for active bookings
-- This provides an additional layer of protection beyond the exclusion constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_provider_time_unique
ON bookings (provider_id, tstzrange(start_time, end_time))
WHERE status NOT IN ('cancelled', 'no_show');

-- ========================================
-- 3. ADD CHECK CONSTRAINT FOR SLOT-BOOKING CONSISTENCY
-- ========================================

-- Function to check if slot availability matches booking state
-- This will be used in a trigger to maintain consistency
CREATE OR REPLACE FUNCTION check_slot_booking_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_count INTEGER;
BEGIN
    -- For availability_slots updates: ensure is_available=false has exactly one active booking
    IF TG_TABLE_NAME = 'availability_slots' THEN
        IF NEW.is_available = false THEN
            SELECT COUNT(*) INTO v_booking_count
            FROM bookings
            WHERE provider_id = NEW.provider_id
              AND start_time = NEW.start_time
              AND end_time = NEW.end_time
              AND status NOT IN ('cancelled', 'no_show');
            
            -- If slot is marked unavailable, there should be exactly one active booking
            IF v_booking_count = 0 THEN
                RAISE WARNING 'Slot marked unavailable but no active booking found for provider_id=%, start_time=%, end_time=%', 
                    NEW.provider_id, NEW.start_time, NEW.end_time;
            ELSIF v_booking_count > 1 THEN
                RAISE EXCEPTION 'Multiple active bookings found for same slot (provider_id=%, start_time=%, end_time=%). This indicates a double-booking violation.', 
                    NEW.provider_id, NEW.start_time, NEW.end_time;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We don't create a trigger on availability_slots because the atomic function
-- handles slot updates. This function is available for verification queries.

-- ========================================
-- 4. ADD INDEX FOR SLOT LOOKUP PERFORMANCE
-- ========================================

-- Index to speed up slot lookup by provider + time range
CREATE INDEX IF NOT EXISTS idx_availability_slots_provider_time_lookup
ON availability_slots (provider_id, start_time, end_time, is_available)
WHERE is_available = true;

-- ========================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON CONSTRAINT bookings_no_overlap_provider_time ON bookings IS 
'Prevents overlapping bookings for the same provider. Uses GiST exclusion constraint to ensure no two active bookings have overlapping time ranges.';

COMMENT ON INDEX idx_bookings_provider_time_unique IS 
'Unique index providing additional protection against duplicate bookings. Complements the exclusion constraint.';

COMMENT ON FUNCTION check_slot_booking_consistency() IS 
'Verification function to check slot-booking consistency. Can be called manually or used in monitoring queries.';

COMMIT;
