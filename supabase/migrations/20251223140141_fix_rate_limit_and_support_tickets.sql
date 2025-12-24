-- Fix rate limiting function
-- ========================================

-- Create rate limiting table if it doesn't exist
CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 1,
    PRIMARY KEY (ip, window_start)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_window ON rate_limits(ip, window_start);

-- Create or replace the bump_rate_limit function
CREATE OR REPLACE FUNCTION bump_rate_limit(
    p_ip TEXT,
    p_max INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    -- Calculate window start (round down to nearest window)
    v_window_start := date_trunc('second', NOW()) - 
        (EXTRACT(EPOCH FROM date_trunc('second', NOW()))::BIGINT % p_window_seconds || ' seconds')::INTERVAL;
    
    -- Try to insert or update
    INSERT INTO rate_limits (ip, window_start, request_count)
    VALUES (p_ip, v_window_start, 1)
    ON CONFLICT (ip, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;
    
    -- Clean up old entries (older than 1 hour)
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour';
    
    -- Return false if limit exceeded, true otherwise
    RETURN v_count <= p_max;
END;
$$;

-- Fix support_tickets table schema
-- ========================================

-- Add 'body' column as alias for 'description' (for backward compatibility)
-- First check if we need to add subject column too
DO $$
BEGIN
    -- Add 'subject' column if it doesn't exist (alias for 'title')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' 
        AND column_name = 'subject'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN subject TEXT;
        -- Copy existing title values to subject
        UPDATE support_tickets SET subject = title WHERE subject IS NULL;
    END IF;
    
    -- Add 'body' column if it doesn't exist (alias for 'description')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_tickets' 
        AND column_name = 'body'
    ) THEN
        ALTER TABLE support_tickets ADD COLUMN body TEXT;
        -- Copy existing description values to body
        UPDATE support_tickets SET body = description WHERE body IS NULL;
    END IF;
END $$;

-- Create a view or trigger to keep subject/body in sync with title/description
-- For now, we'll use a trigger to keep them synchronized
CREATE OR REPLACE FUNCTION sync_support_ticket_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Sync title -> subject
    IF NEW.title IS DISTINCT FROM OLD.title THEN
        NEW.subject := NEW.title;
    END IF;
    
    -- Sync description -> body
    IF NEW.description IS DISTINCT FROM OLD.description THEN
        NEW.body := NEW.description;
    END IF;
    
    -- Sync subject -> title (if subject is updated directly)
    IF NEW.subject IS DISTINCT FROM OLD.subject AND (OLD.subject IS NULL OR NEW.subject IS DISTINCT FROM OLD.title) THEN
        NEW.title := NEW.subject;
    END IF;
    
    -- Sync body -> description (if body is updated directly)
    IF NEW.body IS DISTINCT FROM OLD.body AND (OLD.body IS NULL OR NEW.body IS DISTINCT FROM OLD.description) THEN
        NEW.description := NEW.body;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS sync_support_ticket_fields_trigger ON support_tickets;
CREATE TRIGGER sync_support_ticket_fields_trigger
    BEFORE INSERT OR UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION sync_support_ticket_fields();









