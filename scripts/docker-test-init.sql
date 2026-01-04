-- Bookiji deterministic test DB init (runs once on fresh volume)
-- Goals:
-- - Ensure Supabase Postgres image can run its internal migrate.sh (needs supabase_admin role)
-- - Avoid conflicting with Supabase's own init scripts (which create roles like anon/authenticated/service_role)

-- 1) Role required by supabase/postgres init scripts
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin WITH LOGIN PASSWORD 'postgres' SUPERUSER;
  ELSE
    ALTER ROLE supabase_admin WITH PASSWORD 'postgres';
  END IF;
END
$$;

-- Note: auth schema is created by Supabase's built-in init scripts.
