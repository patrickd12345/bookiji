-- ✨ Development Fixes: RLS, Missing Column, Profile Sync
-- Date: 2025-01-24
-- Description:
--   * Drop problematic recursive policies on profiles
--   * Add simple permissive RLS policies for core tables (dev only)
--   * Add missing column service_radius_km to provider_locations
--   * Ensure every user has a matching profile row
--   * Re-establish foreign keys / indexes if needed

begin;

-- 1. Fix profiles table recursion & ensure table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  role text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Drop recursive / broken policies on profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Enable RLS & add simple dev policy (allow everything)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY dev_all_profiles ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. Add permissive dev policies to core tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','services','availability_slots','bookings','reviews','provider_locations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS dev_all ON public.%I', tbl);
    EXECUTE format('CREATE POLICY dev_all ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END$$;

-- 3. Add missing column to provider_locations (if not present)
ALTER TABLE public.provider_locations
  ADD COLUMN IF NOT EXISTS service_radius_km numeric DEFAULT 5 NOT NULL;

-- 4. Sync profiles with existing users
INSERT INTO public.profiles (id, full_name, email, role)
SELECT u.id, u.full_name, u.email, coalesce(u.role,'customer')
FROM public.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

commit; 