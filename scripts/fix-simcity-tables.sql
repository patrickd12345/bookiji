-- Apply phase3 migration directly (table creation only)
-- This ensures simcity_run_events exists even if migration history is inconsistent

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

CREATE TABLE IF NOT EXISTS simcity_run_live (
    run_id uuid PRIMARY KEY REFERENCES simcity_runs(id) ON DELETE CASCADE,
    status text NOT NULL,
    last_event_index int NOT NULL DEFAULT -1,
    last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
    last_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_message text
);

ALTER TABLE simcity_runs 
ADD COLUMN IF NOT EXISTS pass boolean,
ADD COLUMN IF NOT EXISTS fail_forensic jsonb,
ADD COLUMN IF NOT EXISTS duration_seconds_actual float;

ALTER TABLE simcity_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE simcity_run_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE simcity_run_live ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simcity_run_events' AND policyname = 'service_role_all_events') THEN
        CREATE POLICY "service_role_all_events" ON simcity_run_events FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simcity_run_events' AND policyname = 'authenticated_read_events') THEN
        CREATE POLICY "authenticated_read_events" ON simcity_run_events FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simcity_run_snapshots' AND policyname = 'service_role_all_snapshots') THEN
        CREATE POLICY "service_role_all_snapshots" ON simcity_run_snapshots FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simcity_run_snapshots' AND policyname = 'authenticated_read_snapshots') THEN
        CREATE POLICY "authenticated_read_snapshots" ON simcity_run_snapshots FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simcity_run_live' AND policyname = 'service_role_all_live') THEN
        CREATE POLICY "service_role_all_live" ON simcity_run_live FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'simcity_run_live' AND policyname = 'authenticated_read_live') THEN
        CREATE POLICY "authenticated_read_live" ON simcity_run_live FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

