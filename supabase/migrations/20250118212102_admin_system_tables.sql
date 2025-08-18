-- Create audit_logs table for tracking admin actions
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create dead_letter_queue table for failed message processing
CREATE TABLE dead_letter_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_queue TEXT NOT NULL,
    message_payload JSONB NOT NULL,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retried', 'failed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_error_at TIMESTAMPTZ,
    retried_at TIMESTAMPTZ,
    retried_by UUID REFERENCES profiles(id)
);

-- Create indexes for dead_letter_queue
CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_queue ON dead_letter_queue(original_queue);
CREATE INDEX idx_dlq_created_at ON dead_letter_queue(created_at DESC);

-- Create cron_logs table for tracking scheduled job runs
CREATE TABLE cron_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for cron_logs
CREATE INDEX idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX idx_cron_logs_created_at ON cron_logs(created_at DESC);

-- Add is_active column to profiles if it doesn't exist
-- (This might already exist, so we use IF NOT EXISTS pattern)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add business_name column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'business_name') THEN
        ALTER TABLE profiles ADD COLUMN business_name TEXT;
    END IF;
END $$;

-- Add last_login column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_login') THEN
        ALTER TABLE profiles ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Create RLS policies for audit_logs (admin only)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert audit logs" ON audit_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create RLS policies for dead_letter_queue (admin only)
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage DLQ" ON dead_letter_queue
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create RLS policies for cron_logs (admin only)
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron logs" ON cron_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert cron logs" ON cron_logs
    FOR INSERT
    WITH CHECK (true); -- Allow system to insert, but only admins to read

-- Create a helper function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata)
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON dead_letter_queue TO authenticated;
GRANT SELECT, INSERT ON cron_logs TO authenticated;

-- Comment the tables
COMMENT ON TABLE audit_logs IS 'Stores audit trail of admin actions for compliance and debugging';
COMMENT ON TABLE dead_letter_queue IS 'Stores failed messages for manual retry and investigation';
COMMENT ON TABLE cron_logs IS 'Tracks scheduled job execution status and performance';
