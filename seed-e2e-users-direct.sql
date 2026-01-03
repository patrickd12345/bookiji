-- Disable triggers temporarily to avoid profile auto-creation issues
SET session_replication_role = replica;

-- Delete existing E2E users
DELETE FROM auth.users 
WHERE email IN ('e2e-admin@bookiji.test', 'e2e-vendor@bookiji.test', 'e2e-customer@bookiji.test');

-- Create E2E users using auth schema
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  raw_user_meta_data
) VALUES
  (
    'e2e-admin-id-12345678901234567890',
    '00000000-0000-0000-0000-000000000000',
    'e2e-admin@bookiji.test',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    '{"full_name": "E2E Admin", "role": "admin"}'::jsonb
  ),
  (
    'e2e-vendor-id-1234567890123456789',
    '00000000-0000-0000-0000-000000000000',
    'e2e-vendor@bookiji.test',
    crypt('TestPassword123!', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    '{"full_name": "E2E Vendor", "role": "vendor"}'::jsonb
  ),
  (
    'e2e-customer-id-123456789012345678',
    '00000000-0000-0000-0000-000000000000',
    'e2e-customer@bookiji.test',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    '{"full_name": "E2E Customer", "role": "customer"}'::jsonb
  );

-- Re-enable triggers
SET session_replication_role = default;

SELECT 'E2E users created successfully' as status;
