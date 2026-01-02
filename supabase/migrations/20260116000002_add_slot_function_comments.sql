-- Add comments for documentation
COMMENT ON CONSTRAINT availability_slots_no_overlap ON availability_slots IS 'Prevents overlapping availability slots for the same provider. Uses GiST exclusion constraint to ensure no two available slots have overlapping time ranges.';

COMMENT ON FUNCTION create_slot_atomically IS 'Atomically creates an availability slot with conflict detection. Returns conflicts if any overlapping slots exist.';
