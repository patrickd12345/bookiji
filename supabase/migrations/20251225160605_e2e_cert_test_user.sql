-- Idempotent seeding of E2E certification test user
-- This ensures the SimCity E2E certification can run auth flows

DO $$
DECLARE
  v_instance_id UUID;
  v_user_id UUID := 'e2e00000-0000-0000-0000-000000000001'::UUID;
BEGIN
  -- Get the current auth instance ID
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- 1. Insert into auth.users (idempotent)
  INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    aud, 
    role
  )
  VALUES (
    v_user_id,
    v_instance_id,
    'e2e-vendor@bookiji.test',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"e2e":true}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE SET 
    instance_id = EXCLUDED.instance_id,
    email = EXCLUDED.email,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW();

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (
    id, 
    user_id, 
    identity_data, 
    provider, 
    provider_id, 
    created_at, 
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    '{"email":"e2e-vendor@bookiji.test"}',
    'email',
    v_user_id::TEXT,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Insert into public.profiles (matching auth.users)
  -- Profile id should match auth_user_id for the fallback query to work
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    role,
    full_name
  )
  VALUES (
    v_user_id,
    v_user_id,
    'e2e-vendor@bookiji.test',
    'vendor',
    'E2E Test Vendor'
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

END $$;

