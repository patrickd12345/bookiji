-- Verify Scheduling Kill Switch Migration
-- Run this query to verify system_flags table exists and has correct data

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'system_flags'
) as table_exists;

-- Get scheduling_enabled flag
SELECT * FROM system_flags WHERE key = 'scheduling_enabled';





