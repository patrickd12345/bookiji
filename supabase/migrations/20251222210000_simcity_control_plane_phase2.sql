-- Migration: 20251222210000_simcity_control_plane_phase2.sql

-- Status constraint
-- (PENDING | RUNNING | STOPPED | COMPLETED | FAILED)

CREATE TABLE IF NOT EXISTS simcity_run_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by text NOT NULL,
    tier text NOT NULL,
    seed bigint,
    concurrency int NOT NULL DEFAULT 1,
    max_events int NOT NULL DEFAULT 100,
    duration_seconds int NOT NULL DEFAULT 60,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'STOPPED', 'COMPLETED', 'FAILED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    ended_at timestamptz,
    run_id uuid REFERENCES simcity_runs(id)
);

-- Enable RLS
ALTER TABLE simcity_run_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "service_role_all" ON simcity_run_requests FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "authenticated_read" ON simcity_run_requests FOR SELECT TO authenticated USING (true);











