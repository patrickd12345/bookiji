-- Atomic reschedule function
-- Ensures that rescheduling a booking (releasing old slot, claiming new slot, updating booking) is atomic

CREATE OR REPLACE FUNCTION reschedule_booking_atomically(
  p_booking_id UUID,
  p_new_slot_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_new_slot availability_slots%ROWTYPE;
  v_old_slot_id UUID;
BEGIN
  -- 1. Lock booking row for update
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Booking not found'::TEXT;
    RETURN;
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Booking is cancelled'::TEXT;
    RETURN;
  END IF;

  -- 2. Lock new slot for update
  SELECT * INTO v_new_slot FROM availability_slots WHERE id = p_new_slot_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'New slot not found'::TEXT;
    RETURN;
  END IF;

  IF NOT v_new_slot.is_available THEN
    RETURN QUERY SELECT false, NULL::UUID, 'New slot is not available'::TEXT;
    RETURN;
  END IF;

  IF v_new_slot.provider_id != v_booking.provider_id THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Slot provider mismatch'::TEXT;
    RETURN;
  END IF;

  -- 3. Identify and lock old slot
  -- We match by provider_id and time range since bookings don't store slot_id
  SELECT id INTO v_old_slot_id 
  FROM availability_slots 
  WHERE provider_id = v_booking.provider_id 
    AND start_time = v_booking.start_time 
    AND end_time = v_booking.end_time
  FOR UPDATE;

  -- 4. Perform updates
  -- Mark old slot as available (if found)
  IF v_old_slot_id IS NOT NULL THEN
    UPDATE availability_slots SET is_available = true, updated_at = NOW() WHERE id = v_old_slot_id;
  END IF;

  -- Mark new slot as unavailable
  UPDATE availability_slots SET is_available = false, updated_at = NOW() WHERE id = p_new_slot_id;

  -- Update booking with new times
  UPDATE bookings 
  SET start_time = v_new_slot.start_time, 
      end_time = v_new_slot.end_time, 
      updated_at = NOW() 
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN QUERY SELECT true, v_booking.id, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION reschedule_booking_atomically(UUID, UUID) TO authenticated, anon, service_role;












