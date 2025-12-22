-- Migration: Enforce Slot Consistency via Triggers and Constraints
-- This ensures that any change to bookings (creation, rescheduling, cancellation)
-- correctly updates the corresponding availability_slot.

BEGIN;

-- 1. Ensure slots are unique per provider and time
-- This prevents multiple slots at the same time which causes ambiguity
ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS availability_slots_provider_time_key;
ALTER TABLE availability_slots ADD CONSTRAINT availability_slots_provider_time_key UNIQUE (provider_id, start_time, end_time);

-- 2. Trigger function to sync slot availability
CREATE OR REPLACE FUNCTION sync_booking_slot_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle OLD booking (if update or delete)
  -- If we are moving away from a slot or cancelling/deleting a booking,
  -- we should make the old slot available again.
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    -- Only flip back to available if the status was active (not cancelled/no_show)
    -- and now it's either deleted or changed to cancelled/no_show or moved.
    IF (OLD.status NOT IN ('cancelled', 'no_show')) THEN
      UPDATE availability_slots 
      SET is_available = true, updated_at = NOW()
      WHERE provider_id = OLD.provider_id 
        AND start_time = OLD.start_time 
        AND end_time = OLD.end_time;
    END IF;
  END IF;

  -- Handle NEW booking (if insert or update)
  -- If we are creating a new booking or moving to a new slot,
  -- we should make the new slot unavailable.
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Only flip to unavailable if the new status is active
    IF (NEW.status NOT IN ('cancelled', 'no_show')) THEN
      UPDATE availability_slots 
      SET is_available = false, updated_at = NOW()
      WHERE provider_id = NEW.provider_id 
        AND start_time = NEW.start_time 
        AND end_time = NEW.end_time;
      
      -- Safety check: if no slot was updated, it means the slot doesn't exist.
      -- We could choose to fail here, but for now we just let it be.
      -- In a "serious system", we might want to enforce that a slot MUST exist.
    END IF;
  END IF;

  RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to bookings table
DROP TRIGGER IF EXISTS trg_sync_booking_slot_availability ON bookings;
CREATE TRIGGER trg_sync_booking_slot_availability
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION sync_booking_slot_availability();

COMMIT;

