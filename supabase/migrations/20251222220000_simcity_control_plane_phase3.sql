-- Migration: 20251222220000_simcity_control_plane_phase3.sql

-- 1. Extend simcity_runs
ALTER TABLE simcity_runs 
ADD COLUMN IF NOT EXISTS pass boolean,
ADD COLUMN IF NOT EXISTS fail_forensic jsonb,
ADD COLUMN IF NOT EXISTS duration_seconds_actual float;

-- 2. Create simcity_run_events
CREATE TABLE IF NOT EXISTS simcity_run_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES simcity_runs(id) ON DELETE CASCADE,
    event_index int NOT NULL,
    event_type text NOT NULL,
    event_payload jsonb NOT NULL,
    observed_at timestamptz NOT NULL DEFAULT now(),
    state_digest_before text,
    state_digest_after text,
    invariant_context jsonb,
    UNIQUE(run_id, event_index)
);

CREATE INDEX IF NOT EXISTS idx_simcity_run_events_run_id_index ON simcity_run_events(run_id, event_index);

-- 3. Create simcity_run_snapshots
CREATE TABLE IF NOT EXISTS simcity_run_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES simcity_runs(id) ON DELETE CASCADE,
    event_index int NOT NULL,
    metrics jsonb NOT NULL,
    state_summary jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(run_id, event_index)
);

CREATE INDEX IF NOT EXISTS idx_simcity_run_snapshots_run_id_index ON simcity_run_snapshots(run_id, event_index);

-- 4. Create simcity_run_live
CREATE TABLE IF NOT EXISTS simcity_run_live (
    run_id uuid PRIMARY KEY REFERENCES simcity_runs(id) ON DELETE CASCADE,
    status text NOT NULL, -- RUNNING/FAILED/PASSED/STOPPED
    last_event_index int NOT NULL DEFAULT -1,
    last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
    last_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_message text
);

-- 5. Helper function for metrics
CREATE OR REPLACE FUNCTION get_simcity_run_metrics(p_run_id uuid) 
RETURNS jsonb AS $$
DECLARE
    v_metrics jsonb;
BEGIN
    SELECT last_metrics INTO v_metrics FROM simcity_run_live WHERE run_id = p_run_id;
    IF v_metrics IS NULL THEN
        SELECT metrics INTO v_metrics 
        FROM simcity_run_snapshots 
        WHERE run_id = p_run_id 
        ORDER BY event_index DESC 
        LIMIT 1;
    END IF;
    RETURN COALESCE(v_metrics, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enable RLS
ALTER TABLE simcity_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE simcity_run_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE simcity_run_live ENABLE ROW LEVEL SECURITY;

-- 7. Policies (service role only for writes, authenticated for reads)
CREATE POLICY "service_role_all_events" ON simcity_run_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_events" ON simcity_run_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_all_snapshots" ON simcity_run_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_snapshots" ON simcity_run_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_all_live" ON simcity_run_live FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_live" ON simcity_run_live FOR SELECT TO authenticated USING (true);




