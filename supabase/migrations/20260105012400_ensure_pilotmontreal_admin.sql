-- Ensure pilotmontreal@gmail.com is registered as admin
-- This migration ensures the user has admin role in profiles table
-- If the user doesn't exist in auth.users yet, the profile will be created when they register

DO $$
DECLARE
  v_user_id UUID;
  v_app_user_id UUID;
  v_email TEXT := 'pilotmontreal@gmail.com';
BEGIN
  -- Find the user by email in auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email 
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Update or insert profile with admin role
    -- Try by id first, then by auth_user_id if id doesn't exist
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
      COALESCE((SELECT full_name FROM public.profiles WHERE auth_user_id = v_user_id), 'Admin User'),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      email = EXCLUDED.email,
      updated_at = NOW();
    
    -- Also ensure by auth_user_id if profile exists with different id
    UPDATE public.profiles
    SET role = 'admin',
        email = v_email,
        updated_at = NOW()
    WHERE auth_user_id = v_user_id
      AND role != 'admin';

    -- Ensure app_users entry exists
    INSERT INTO public.app_users (
      id,
      auth_user_id,
      display_name
    )
    VALUES (
      gen_random_uuid(),
      v_user_id,
      COALESCE((SELECT full_name FROM public.profiles WHERE auth_user_id = v_user_id), 'Admin User')
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
    RAISE NOTICE 'User not found for email: % - profile will be created with admin role when they register', v_email;
    
    -- Create a trigger function that will grant admin role when this user registers
    -- This ensures admin role is set even if user registers after migration runs
    CREATE OR REPLACE FUNCTION ensure_pilotmontreal_admin()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.email = 'pilotmontreal@gmail.com' THEN
        NEW.role := 'admin';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Drop trigger if it exists
    DROP TRIGGER IF EXISTS ensure_pilotmontreal_admin_trigger ON public.profiles;
    
    -- Create trigger to auto-set admin role for this email
    CREATE TRIGGER ensure_pilotmontreal_admin_trigger
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION ensure_pilotmontreal_admin();
      
    RAISE NOTICE 'Created trigger to auto-grant admin role when user registers';
  END IF;
END $$;
