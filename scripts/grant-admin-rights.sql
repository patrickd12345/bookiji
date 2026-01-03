-- Grant admin rights to specific email addresses
-- Emails: pilotmontreal@gmail.com, patrick_duchesneau_1@hotmail.com
-- Run this SQL directly in Supabase SQL Editor or via psql

DO $$
DECLARE
  v_user_id UUID;
  v_app_user_id UUID;
  v_email TEXT;
BEGIN
  -- Process each email
  FOR v_email IN SELECT unnest(ARRAY['pilotmontreal@gmail.com', 'patrick_duchesneau_1@hotmail.com']) LOOP
    -- Find the user by email in auth.users
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = v_email 
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      -- Update or insert profile with admin role
      INSERT INTO public.profiles (
        id,
        auth_user_id,
        email,
        role,
        full_name,
        updated_at
      )
      VALUES (
        v_user_id,
        v_user_id,
        v_email,
        'admin',
        COALESCE((SELECT full_name FROM public.profiles WHERE id = v_user_id), 'Admin User'),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        email = EXCLUDED.email,
        updated_at = NOW();

      -- Ensure app_users entry exists
      INSERT INTO public.app_users (
        id,
        auth_user_id,
        display_name
      )
      VALUES (
        gen_random_uuid(),
        v_user_id,
        COALESCE((SELECT full_name FROM public.profiles WHERE id = v_user_id), 'Admin User')
      )
      ON CONFLICT (auth_user_id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, app_users.display_name)
      RETURNING id INTO v_app_user_id;

      -- Get app_user_id if it already existed
      IF v_app_user_id IS NULL THEN
        SELECT id INTO v_app_user_id FROM app_users WHERE auth_user_id = v_user_id;
      END IF;

      -- Ensure admin role in user_roles
      IF v_app_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (
          app_user_id,
          role
        )
        VALUES (
          v_app_user_id,
          'admin'
        )
        ON CONFLICT (app_user_id, role) DO NOTHING;
      END IF;

      RAISE NOTICE 'Granted admin rights to: % (user_id: %)', v_email, v_user_id;
    ELSE
      RAISE NOTICE 'User not found for email: % - will be granted admin when they register', v_email;
    END IF;
  END LOOP;
END $$;
