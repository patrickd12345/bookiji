-- Migration: Create SECURITY DEFINER function for E2E profile seeding
-- Adds a reliable server-side seeding function that bypasses RLS for deterministic E2E user profiles.
BEGIN;

-- SECURITY DEFINER function to insert/update profiles for E2E seeding
CREATE OR REPLACE FUNCTION public.seed_e2e_profile(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, email, full_name, role, created_at, updated_at)
  VALUES (p_auth_user_id, p_auth_user_id, p_email, p_full_name, p_role, now(), now())
  ON CONFLICT (auth_user_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();
END;
$$;

-- Grant execute on the function to service_role (defensive; function is SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.seed_e2e_profile(uuid, text, text, text) TO service_role, supabase_admin;

COMMIT;

