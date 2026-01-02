-- Grant execute permissions for create_slot_atomically function
GRANT EXECUTE ON FUNCTION create_slot_atomically(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO authenticated, anon, service_role;
