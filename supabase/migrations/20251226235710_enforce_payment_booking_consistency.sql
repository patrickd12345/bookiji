-- Migration: Enforce Payment ↔ Booking Consistency
-- Prevents confirmed bookings without verified payment intent
-- Adds constraints and triggers to ensure payment consistency

BEGIN;

-- 1. Add hold_expires_at column if it doesn't exist (for reconciliation)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'hold_expires_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN hold_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Add CHECK constraint: confirmed_at implies stripe_payment_intent_id is not null
-- This prevents confirmed bookings without payment intent
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_confirmed_requires_payment;
  
  -- Add constraint: if confirmed_at is set, stripe_payment_intent_id must be set
  ALTER TABLE bookings ADD CONSTRAINT bookings_confirmed_requires_payment
    CHECK (
      (confirmed_at IS NULL) OR 
      (stripe_payment_intent_id IS NOT NULL)
    );
END $$;

-- 3. Add trigger to prevent state='confirmed' without payment verification
-- This works for the new state-based model
CREATE OR REPLACE FUNCTION prevent_unverified_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If state is being set to provider-confirmed (or legacy status to 'confirmed')
  IF (NEW.state = 'provider_confirmed' OR NEW.status = 'confirmed') THEN
    -- Require stripe_payment_intent_id
    IF NEW.stripe_payment_intent_id IS NULL THEN
      RAISE EXCEPTION 'Cannot confirm booking without payment intent. State: %, Status: %', NEW.state, NEW.status;
    END IF;
    
    -- Require confirmed_at to be set when confirming
    IF NEW.confirmed_at IS NULL THEN
      RAISE EXCEPTION 'Cannot confirm booking without confirmed_at timestamp';
    END IF;
  END IF;
  
  -- If confirmed_at is being set, require payment intent
  IF NEW.confirmed_at IS NOT NULL AND OLD.confirmed_at IS NULL THEN
    IF NEW.stripe_payment_intent_id IS NULL THEN
      RAISE EXCEPTION 'Cannot set confirmed_at without payment intent';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_prevent_unverified_confirmation ON bookings;

-- Create trigger
CREATE TRIGGER trg_prevent_unverified_confirmation
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION prevent_unverified_confirmation();

-- 4. Function to cancel expired holds and release slots
CREATE OR REPLACE FUNCTION cancel_expired_holds()
RETURNS TABLE (
  cancelled_count INTEGER,
  released_slots_count INTEGER
) AS $$
DECLARE
  v_cancelled INTEGER := 0;
  v_released INTEGER := 0;
  v_booking RECORD;
BEGIN
  -- Find all hold_placed bookings that have expired
  FOR v_booking IN
    SELECT id, provider_id, start_time, end_time, stripe_payment_intent_id
    FROM bookings
    WHERE state = 'hold_placed'
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at < NOW()
    FOR UPDATE
  LOOP
    -- Cancel the booking
    UPDATE bookings
    SET 
      state = 'cancelled',
      cancelled_at = NOW(),
      cancelled_reason = 'Hold expired'
    WHERE id = v_booking.id;
    
    v_cancelled := v_cancelled + 1;
    
    -- Release the slot if booking has provider and time info
    IF v_booking.provider_id IS NOT NULL AND 
       v_booking.start_time IS NOT NULL AND 
       v_booking.end_time IS NOT NULL THEN
      
      UPDATE availability_slots
      SET 
        is_available = true,
        updated_at = NOW()
      WHERE provider_id = v_booking.provider_id
        AND start_time = v_booking.start_time
        AND end_time = v_booking.end_time;
      
      -- Count if any rows were updated
      IF FOUND THEN
        v_released := v_released + 1;
      END IF;
    END IF;
    
    -- Log the cancellation
    INSERT INTO booking_audit_log (
      booking_id,
      from_state,
      to_state,
      action,
      actor_type,
      actor_id,
      metadata
    ) VALUES (
      v_booking.id,
      'hold_placed',
      'cancelled',
      'state_change',
      'system',
      'reconciliation_job',
      jsonb_build_object(
        'reason', 'Hold expired',
        'expired_at', v_booking.hold_expires_at
      )
    );
  END LOOP;
  
  RETURN QUERY SELECT v_cancelled, v_released;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cancel_expired_holds() TO authenticated, anon, service_role;

COMMIT;

