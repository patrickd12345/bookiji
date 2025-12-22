-- Migration: 20251222200000_simcity_control_plane_phase1.sql
CREATE TABLE IF NOT EXISTS simcity_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tier text NOT NULL,
    seed bigint NOT NULL,
    concurrency int NOT NULL,
    max_events int NOT NULL,
    duration_seconds int NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    result text CHECK (result IN ('PASS', 'FAIL')),
    fail_invariant text,
    fail_event_index int
);

-- Enable RLS
ALTER TABLE simcity_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "service_role_all" ON simcity_runs FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "authenticated_read" ON simcity_runs FOR SELECT TO authenticated USING (true);

-- Metrics function
CREATE OR REPLACE FUNCTION get_simcity_metrics()
RETURNS TABLE (
    bookings_created_count bigint,
    cancellations_count bigint,
    reschedules_count bigint,
    active_bookings_count bigint,
    slots_available_count bigint,
    slots_unavailable_count bigint
) AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT count(*) FROM bookings),
        (SELECT count(*) FROM bookings WHERE status = 'cancelled'),
        (SELECT count(*) FROM bookings WHERE updated_at > created_at AND status != 'cancelled'),
        (SELECT count(*) FROM bookings WHERE status IN ('pending', 'confirmed')),
        (SELECT count(*) FROM availability_slots WHERE is_available = true),
        (SELECT count(*) FROM availability_slots WHERE is_available = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_simcity_metrics() TO authenticated, anon, service_role;

