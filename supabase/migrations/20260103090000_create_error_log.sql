-- Migration: Create error_log table for aggregated errors
CREATE TABLE IF NOT EXISTS public.error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  error_type TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'error',
  occurrences INTEGER DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_log_endpoint ON public.error_log (endpoint);
CREATE INDEX IF NOT EXISTS idx_error_log_last_seen ON public.error_log (last_seen);

GRANT SELECT ON public.error_log TO authenticated;
GRANT SELECT ON public.error_log TO anon;

-- Enable RLS and leave policies to DB migration process if needed
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

