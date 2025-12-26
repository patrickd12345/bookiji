-- Create admin user for Bookiji
-- Email: admin@bookiji.com
-- Password: Taratata!1232123
-- Role: admin

DO $$
DECLARE
  v_instance_id UUID;
  v_user_id UUID := gen_random_uuid();
  v_app_user_id UUID;
BEGIN
  -- Get the current auth instance ID
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- 1. Insert into auth.users
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
    role,
    confirmation_token
  )
  VALUES (
    v_user_id,
    v_instance_id,
    'admin@bookiji.com',
    crypt('Taratata!1232123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"admin":true}',
    'authenticated',
    'authenticated',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET 
    instance_id = EXCLUDED.instance_id,
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW();

  -- Get the user_id from the inserted/updated record
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@bookiji.com';

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
    '{"email":"admin@bookiji.com"}',
    'email',
    v_user_id::TEXT,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Insert into public.profiles with admin role
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
    'admin@bookiji.com',
    'admin',
    'Admin User'
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email,
    role = 'admin',
    full_name = EXCLUDED.full_name;

  -- 4. Insert into app_users (for multi-role system)
  INSERT INTO public.app_users (
    id,
    auth_user_id,
    display_name
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'Admin User'
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name
  RETURNING id INTO v_app_user_id;

  -- Get app_user_id if it already existed
  IF v_app_user_id IS NULL THEN
    SELECT id INTO v_app_user_id FROM app_users WHERE auth_user_id = v_user_id;
  END IF;

  -- 5. Insert into user_roles with admin role
  INSERT INTO public.user_roles (
    app_user_id,
    role
  )
  VALUES (
    v_app_user_id,
    'admin'
  )
  ON CONFLICT (app_user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin user created successfully: admin@bookiji.com';
END $$;

