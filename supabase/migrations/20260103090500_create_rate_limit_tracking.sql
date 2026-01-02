-- Migration: Create rate_limit_violations / tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  endpoint TEXT,
  violation_count INTEGER DEFAULT 0,
  first_violation TIMESTAMPTZ DEFAULT NOW(),
  last_violation TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rlv_ip ON public.rate_limit_violations (ip_address);
CREATE INDEX IF NOT EXISTS idx_rlv_last_violation ON public.rate_limit_violations (last_violation);

GRANT SELECT ON public.rate_limit_violations TO authenticated;
GRANT SELECT ON public.rate_limit_violations TO anon;

ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

