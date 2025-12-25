-- Migration: Enforce No Past Booking (Invariant VI-1)
-- Prevents bookings from being created in the past
-- 
-- Policy: Strict enforcement - booking fails if start_time <= now()
-- This check is performed inside the atomic transaction before slot claim

-- Update atomic booking claim function to include time validation
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
  v_now TIMESTAMPTZ;
BEGIN
  -- Get current server time (source of truth)
  v_now := NOW();
  
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
  
  -- Invariant VI-1: No Past Booking
  -- Booking must be in the future (strict: start_time > now())
  IF v_slot.start_time <= v_now THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Cannot create booking in the past'::TEXT;
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

-- Grant permissions (re-grant in case function was recreated)
GRANT EXECUTE ON FUNCTION claim_slot_and_create_booking(UUID, UUID, UUID, UUID, UUID, DECIMAL) TO authenticated, anon, service_role;

