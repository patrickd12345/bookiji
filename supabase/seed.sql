-- Seed file for chaos testing
-- Creates auth users that will be used by the chaos harness
-- This runs after migrations on `supabase db reset`

-- Note: This file is idempotent - safe to run multiple times
-- The chaos harness will create users with deterministic IDs based on seed

-- No seed data needed here - harness creates users on-demand via RPC
-- This file exists to ensure seed.sql is present (Supabase requirement)
