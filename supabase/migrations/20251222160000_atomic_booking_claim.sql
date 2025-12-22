-- Atomic booking claim function and constraint
-- Prevents race conditions in concurrent booking creation

-- 1. Atomic booking claim function
CREATE OR REPLACE FUNCTION claim_slot_and_create_booking(
  p_slot_id UUID,
  p_booking_id UUID,
  p_customer_id UUID,
  p_provider_id UUID,
  p_service_id UUID,
  p_total_amount DECIMAL(8,2) DEFAULT 0
)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_slot availability_slots%ROWTYPE;
  v_booking bookings%ROWTYPE;
BEGIN
  -- Lock the slot row for update
  SELECT * INTO v_slot FROM availability_slots WHERE id = p_slot_id FOR UPDATE;
  
  -- Validation
  IF NOT FOUND THEN 
    RETURN QUERY SELECT false, NULL::UUID, 'Slot not found'::TEXT; 
    RETURN; 
  END IF;
  
  IF NOT v_slot.is_available THEN 
    RETURN QUERY SELECT false, NULL::UUID, 'Slot is not available'::TEXT; 
    RETURN; 
  END IF;
  
  IF v_slot.provider_id != p_provider_id THEN 
    RETURN QUERY SELECT false, NULL::UUID, 'Slot provider mismatch'::TEXT; 
    RETURN; 
  END IF;
  
  -- Atomic state flip
  UPDATE availability_slots SET is_available = false, updated_at = NOW() WHERE id = p_slot_id;
  
  -- Create booking
  INSERT INTO bookings (id, customer_id, provider_id, service_id, start_time, end_time, status, total_amount)
  VALUES (p_booking_id, p_customer_id, p_provider_id, p_service_id, v_slot.start_time, v_slot.end_time, 'pending', p_total_amount)
  RETURNING * INTO v_booking;
  
  RETURN QUERY SELECT true, v_booking.id, NULL::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback availability on failure
    UPDATE availability_slots SET is_available = true, updated_at = NOW() WHERE id = p_slot_id;
    RETURN QUERY SELECT false, NULL::UUID, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION claim_slot_and_create_booking(UUID, UUID, UUID, UUID, UUID, DECIMAL) TO authenticated, anon, service_role;

-- 2. Exclusion constraint (No overlapping bookings per provider)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap_provider_time;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap_provider_time
EXCLUDE USING gist (provider_id WITH =, tstzrange(start_time, end_time) WITH &&)
WHERE (status NOT IN ('cancelled', 'no_show'));
