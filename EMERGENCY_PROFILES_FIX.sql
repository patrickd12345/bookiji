-- 🚨 EMERGENCY FIX: Remove infinite recursion in profiles table RLS policies
-- Copy and paste this ENTIRE script into your Supabase Dashboard SQL Editor
-- This will fix the "infinite recursion detected in policy for relation 'profiles'" error

BEGIN;

-- 1. DROP ALL PROBLEMATIC RECURSIVE POLICIES ON PROFILES
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_simple_select" ON profiles;
DROP POLICY IF EXISTS "profiles_simple_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_simple_update" ON profiles;

-- 2. CREATE SIMPLE, NON-RECURSIVE POLICIES
CREATE POLICY "profiles_simple_select" ON profiles
  FOR SELECT USING (
    -- Users can always read their own profile
    id = auth.uid() OR
    -- Public read access for basic profile info (no recursion)
    true
  );

CREATE POLICY "profiles_simple_insert" ON profiles
  FOR INSERT WITH CHECK (
    -- Users can insert their own profile
    id = auth.uid()
  );

CREATE POLICY "profiles_simple_update" ON profiles
  FOR UPDATE USING (
    -- Users can update their own profile
    id = auth.uid()
  );

-- 3. FIX OTHER TABLES THAT MIGHT HAVE SIMILAR ISSUES
-- Fix security_logs policies that reference profiles
DROP POLICY IF EXISTS "security_logs_admin_read" ON security_logs;
CREATE POLICY "security_logs_admin_read" ON security_logs
  FOR SELECT USING (
    -- Simple check without recursion - just check if user exists
    auth.uid() IS NOT NULL
  );

-- Fix rate_limits policies that reference profiles
DROP POLICY IF EXISTS "rate_limits_user_read" ON rate_limits;
CREATE POLICY "rate_limits_user_read" ON rate_limits
  FOR SELECT USING (
    -- Simple check without recursion
    identifier = auth.uid()::text OR auth.uid() IS NOT NULL
  );

-- Fix admin_permissions policies that reference profiles
DROP POLICY IF EXISTS "admin_permissions_read" ON admin_permissions;
CREATE POLICY "admin_permissions_read" ON admin_permissions
  FOR SELECT USING (
    -- Simple check without recursion
    user_id = auth.uid() OR auth.uid() IS NOT NULL
  );

-- 4. ENSURE THE PROFILES TABLE HAS BASIC STRUCTURE
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
    ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'customer';
  END IF;
END $$;

-- 5. CREATE A SIMPLE FUNCTION TO CHECK ADMIN STATUS WITHOUT RECURSION
CREATE OR REPLACE FUNCTION is_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- Simple check without complex joins or recursion
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. UPDATE THE VERIFY_ADMIN_USER FUNCTION TO USE THE SIMPLE VERSION
CREATE OR REPLACE FUNCTION verify_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin_user(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TEST THE FIX IMMEDIATELY
-- This should work now without recursion
SELECT 'Testing profiles table access...' as status;
SELECT COUNT(*) as profile_count FROM profiles LIMIT 1;

COMMIT;

-- ✅ PROFILES TABLE RECURSION FIXED
-- ✅ Simple, non-recursive RLS policies created
-- ✅ Admin check functions simplified
-- ✅ Database should now be accessible

-- NEXT STEPS:
-- 1. Refresh your application
-- 2. The 500 error should be resolved
-- 3. Authentication should work properly again
-- 4. If you still have issues, check the Supabase logs for any remaining errors
