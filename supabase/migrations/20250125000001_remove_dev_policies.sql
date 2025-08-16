-- 🔒 Remove Development Permissive Policies
-- Date: 2025-01-25
-- Purpose: Drop the catch-all `dev_all` policies that were added for local
--          development so that the stricter, table-specific RLS policies from
--          earlier migrations are enforced in staging/production.
--
-- NOTE: This migration should run AFTER 20250124000000_dev_policy_and_fixes.sql.
--       Running it locally keeps development wide-open (since developers can
--       choose not to apply this migration) while CI/CD & prod environments
--       will execute it and lock data down.

begin;

-- 1. Core tables – remove `dev_all` policy
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'services',
    'availability_slots',
    'bookings',
    'reviews',
    'provider_locations'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS dev_all ON public.%I;', tbl);
  END LOOP;
END$$;

-- 2. Profiles table – remove standalone permissive policy
DROP POLICY IF EXISTS dev_all_profiles ON public.profiles;

commit; 