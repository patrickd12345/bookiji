-- Migration: Add Verification Function for Booking-Slot Consistency
-- This function can be called by SimCity or monitoring to detect inconsistencies
-- between bookings and availability slots

BEGIN;

-- ========================================
-- VERIFICATION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION verify_booking_slot_consistency()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT,
    violation_count INTEGER,
    details JSONB
) AS $$
DECLARE
    v_unavailable_slots_without_booking INTEGER;
    v_unavailable_slots_with_multiple_bookings INTEGER;
    v_active_bookings_without_slot INTEGER;
    v_double_bookings INTEGER;
BEGIN
    -- Check 1: Slots marked unavailable but no active booking exists
    SELECT COUNT(*) INTO v_unavailable_slots_without_booking
    FROM availability_slots s
    WHERE s.is_available = false
      AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.provider_id = s.provider_id
            AND b.start_time = s.start_time
            AND b.end_time = s.end_time
            AND b.status NOT IN ('cancelled', 'no_show')
      );

    RETURN QUERY SELECT 
        'unavailable_slots_without_booking'::TEXT,
        CASE WHEN v_unavailable_slots_without_booking = 0 THEN 'PASS' ELSE 'FAIL' END,
        CASE 
            WHEN v_unavailable_slots_without_booking = 0 THEN 'All unavailable slots have corresponding active bookings'
            ELSE format('%s slots marked unavailable but no active booking found', v_unavailable_slots_without_booking)
        END,
        v_unavailable_slots_without_booking,
        (SELECT jsonb_agg(jsonb_build_object(
            'slot_id', s.id,
            'provider_id', s.provider_id,
            'start_time', s.start_time,
            'end_time', s.end_time
        ))
        FROM availability_slots s
        WHERE s.is_available = false
          AND NOT EXISTS (
              SELECT 1 FROM bookings b
              WHERE b.provider_id = s.provider_id
                AND b.start_time = s.start_time
                AND b.end_time = s.end_time
                AND b.status NOT IN ('cancelled', 'no_show')
          )
        LIMIT 10) AS details;

    -- Check 2: Slots marked unavailable but multiple active bookings exist (DOUBLE BOOKING)
    SELECT COUNT(DISTINCT s.id) INTO v_unavailable_slots_with_multiple_bookings
    FROM availability_slots s
    WHERE s.is_available = false
      AND (
          SELECT COUNT(*) FROM bookings b
          WHERE b.provider_id = s.provider_id
            AND b.start_time = s.start_time
            AND b.end_time = s.end_time
            AND b.status NOT IN ('cancelled', 'no_show')
      ) > 1;

    RETURN QUERY SELECT 
        'unavailable_slots_with_multiple_bookings'::TEXT,
        CASE WHEN v_unavailable_slots_with_multiple_bookings = 0 THEN 'PASS' ELSE 'FAIL' END,
        CASE 
            WHEN v_unavailable_slots_with_multiple_bookings = 0 THEN 'No double bookings detected'
            ELSE format('%s slots have multiple active bookings (DOUBLE BOOKING DETECTED)', v_unavailable_slots_with_multiple_bookings)
        END,
        v_unavailable_slots_with_multiple_bookings,
        (SELECT jsonb_agg(jsonb_build_object(
            'slot_id', s.id,
            'provider_id', s.provider_id,
            'start_time', s.start_time,
            'end_time', s.end_time,
            'booking_count', (
                SELECT COUNT(*) FROM bookings b
                WHERE b.provider_id = s.provider_id
                  AND b.start_time = s.start_time
                  AND b.end_time = s.end_time
                  AND b.status NOT IN ('cancelled', 'no_show')
            )
        ))
        FROM availability_slots s
        WHERE s.is_available = false
          AND (
              SELECT COUNT(*) FROM bookings b
              WHERE b.provider_id = s.provider_id
                AND b.start_time = s.start_time
                AND b.end_time = s.end_time
                AND b.status NOT IN ('cancelled', 'no_show')
          ) > 1
        LIMIT 10) AS details;

    -- Check 3: Active bookings without corresponding unavailable slot
    SELECT COUNT(*) INTO v_active_bookings_without_slot
    FROM bookings b
    WHERE b.status NOT IN ('cancelled', 'no_show')
      AND NOT EXISTS (
          SELECT 1 FROM availability_slots s
          WHERE s.provider_id = b.provider_id
            AND s.start_time = b.start_time
            AND s.end_time = b.end_time
            AND s.is_available = false
      );

    RETURN QUERY SELECT 
        'active_bookings_without_slot'::TEXT,
        CASE WHEN v_active_bookings_without_slot = 0 THEN 'PASS' ELSE 'WARN' END,
        CASE 
            WHEN v_active_bookings_without_slot = 0 THEN 'All active bookings have corresponding unavailable slots'
            ELSE format('%s active bookings do not have corresponding unavailable slots', v_active_bookings_without_slot)
        END,
        v_active_bookings_without_slot,
        (SELECT jsonb_agg(jsonb_build_object(
            'booking_id', b.id,
            'provider_id', b.provider_id,
            'start_time', b.start_time,
            'end_time', b.end_time,
            'status', b.status
        ))
        FROM bookings b
        WHERE b.status NOT IN ('cancelled', 'no_show')
          AND NOT EXISTS (
              SELECT 1 FROM availability_slots s
              WHERE s.provider_id = b.provider_id
                AND s.start_time = b.start_time
                AND s.end_time = b.end_time
                AND s.is_available = false
          )
        LIMIT 10) AS details;

    -- Check 4: Overlapping bookings for same provider (caught by exclusion constraint, but verify)
    SELECT COUNT(*) INTO v_double_bookings
    FROM bookings b1
    JOIN bookings b2 ON (
        b1.provider_id = b2.provider_id
        AND b1.id < b2.id
        AND b1.status NOT IN ('cancelled', 'no_show')
        AND b2.status NOT IN ('cancelled', 'no_show')
        AND tstzrange(b1.start_time, b1.end_time) && tstzrange(b2.start_time, b2.end_time)
    );

    RETURN QUERY SELECT 
        'overlapping_bookings'::TEXT,
        CASE WHEN v_double_bookings = 0 THEN 'PASS' ELSE 'FAIL' END,
        CASE 
            WHEN v_double_bookings = 0 THEN 'No overlapping bookings detected'
            ELSE format('%s pairs of overlapping bookings detected (DOUBLE BOOKING)', v_double_bookings)
        END,
        v_double_bookings,
        (SELECT jsonb_agg(jsonb_build_object(
            'booking1_id', b1.id,
            'booking2_id', b2.id,
            'provider_id', b1.provider_id,
            'overlap_start', GREATEST(b1.start_time, b2.start_time),
            'overlap_end', LEAST(b1.end_time, b2.end_time)
        ))
        FROM bookings b1
        JOIN bookings b2 ON (
            b1.provider_id = b2.provider_id
            AND b1.id < b2.id
            AND b1.status NOT IN ('cancelled', 'no_show')
            AND b2.status NOT IN ('cancelled', 'no_show')
            AND tstzrange(b1.start_time, b1.end_time) && tstzrange(b2.start_time, b2.end_time)
        )
        LIMIT 10) AS details;

END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_booking_slot_consistency() TO authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION verify_booking_slot_consistency() IS 
'Verifies booking-slot consistency. Returns check results with status (PASS/FAIL/WARN), message, violation count, and details. 
Can be called by SimCity or monitoring systems to detect inconsistencies.';

COMMIT;
