-- Idempotent seeding of chaos users
-- This ensures the harness can always link profiles to auth.users

DO $$
DECLARE
  v_instance_id UUID;
BEGIN
  -- Get the current auth instance ID
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- 1. Insert into auth.users (idempotent)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', v_instance_id, 'vendor.a@chaos.dev', crypt('chaos-password', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"chaos":true}', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-000000000002', v_instance_id, 'vendor.b@chaos.dev', crypt('chaos-password', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"chaos":true}', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-000000000003', v_instance_id, 'customer.a@chaos.dev', crypt('chaos-password', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"chaos":true}', 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-000000000004', v_instance_id, 'customer.b@chaos.dev', crypt('chaos-password', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"chaos":true}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO UPDATE SET 
    instance_id = EXCLUDED.instance_id,
    email = EXCLUDED.email,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW();

  -- 2. Insert into auth.identities
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
  VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '{"email":"vendor.a@chaos.dev"}', 'email', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '{"email":"vendor.b@chaos.dev"}', 'email', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '{"email":"customer.a@chaos.dev"}', 'email', '00000000-0000-0000-0000-000000000003', NOW(), NOW()),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '{"email":"customer.b@chaos.dev"}', 'email', '00000000-0000-0000-0000-000000000004', NOW(), NOW())
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Insert into public.profiles (matching auth.users)
  INSERT INTO public.profiles (id, auth_user_id, email, role, full_name)
  VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'vendor.a@chaos.dev', 'vendor', 'Chaos Vendor A'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'vendor.b@chaos.dev', 'vendor', 'Chaos Vendor B'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'customer.a@chaos.dev', 'customer', 'Chaos Customer A'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'customer.b@chaos.dev', 'customer', 'Chaos Customer B')
  ON CONFLICT (id) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

END $$;




