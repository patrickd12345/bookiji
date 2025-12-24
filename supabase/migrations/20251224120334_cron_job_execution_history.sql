-- Migration: Cron Job Execution History
-- Creates table to track cron job executions for admin management

-- Create cron_job_executions table
CREATE TABLE IF NOT EXISTS cron_job_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id text NOT NULL,
    job_name text NOT NULL,
    job_path text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    status text NOT NULL CHECK (status IN ('success', 'error', 'running')),
    duration_ms integer,
    error_message text,
    result_data jsonb,
    triggered_by text, -- 'scheduled' or 'manual' or user_id
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_job_id ON cron_job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_started_at ON cron_job_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_status ON cron_job_executions(status);
CREATE INDEX IF NOT EXISTS idx_cron_job_executions_job_id_started_at ON cron_job_executions(job_id, started_at DESC);

-- Create cron_job_status table for current status tracking
CREATE TABLE IF NOT EXISTS cron_job_status (
    job_id text PRIMARY KEY,
    job_name text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    last_run_at timestamptz,
    last_success_at timestamptz,
    last_error_at timestamptz,
    execution_count integer NOT NULL DEFAULT 0,
    error_count integer NOT NULL DEFAULT 0,
    next_run_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert initial job statuses
INSERT INTO cron_job_status (job_id, job_name, enabled) VALUES
    ('kb-auto-dedupe', 'KB Auto-Deduplication', true),
    ('kb-crawl', 'KB Crawl', true),
    ('kb-ensure-embeddings', 'KB Ensure Embeddings', true),
    ('sitemap-refresh', 'Sitemap Refresh', true),
    ('detect-no-shows', 'Detect No-Shows', true)
ON CONFLICT (job_id) DO NOTHING;

-- Enable RLS
ALTER TABLE cron_job_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can read/write
CREATE POLICY "Admins can read cron executions" ON cron_job_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Service role can insert cron executions" ON cron_job_executions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read cron status" ON cron_job_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Service role can update cron status" ON cron_job_status
    FOR ALL USING (true) WITH CHECK (true);

-- Function to update job status after execution
CREATE OR REPLACE FUNCTION update_cron_job_status(
    p_job_id text,
    p_status text,
    p_duration_ms integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE cron_job_status
    SET
        last_run_at = now(),
        execution_count = execution_count + 1,
        updated_at = now(),
        last_success_at = CASE WHEN p_status = 'success' THEN now() ELSE last_success_at END,
        last_error_at = CASE WHEN p_status = 'error' THEN now() ELSE last_error_at END,
        error_count = CASE WHEN p_status = 'error' THEN error_count + 1 ELSE error_count END
    WHERE job_id = p_job_id;
END;
$$;


