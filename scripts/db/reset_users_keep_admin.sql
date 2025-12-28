-- ========================================
-- 🚨 DANGEROUS OPERATION - USER RESET
-- ========================================
-- RUN ONLY IN STAGING OR BEFORE GO-LIVE
-- REQUIRES BACKUP FIRST
-- 
-- This script:
-- 1. Keeps exactly ONE admin user (identified by email or UUID)
-- 2. Deletes all other users from auth.users and app tables
-- 3. Runs in a transaction (atomic)
-- 4. Aborts if admin is missing
--
-- Usage:
--   psql -v admin_email="admin@bookiji.com" -f reset_users_keep_admin.sql
--   OR via TypeScript wrapper: pnpm db:reset-users
-- ========================================

BEGIN;

-- Get admin user ID from email (or use provided UUID)
DO $$
DECLARE
    v_admin_email TEXT := COALESCE(:'admin_email', '');
    v_admin_uuid UUID := NULL;
    v_admin_id UUID := NULL;
    v_user_count INTEGER;
BEGIN
    -- Validate input
    IF v_admin_email = '' THEN
        RAISE EXCEPTION 'Admin email must be provided via -v admin_email="..." or ADMIN_EMAIL env var';
    END IF;

    -- Try to resolve admin by email first
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE email = v_admin_email
    LIMIT 1;

    -- If not found by email, try as UUID
    IF v_admin_id IS NULL THEN
        BEGIN
            v_admin_uuid := v_admin_email::UUID;
            SELECT id INTO v_admin_id
            FROM auth.users
            WHERE id = v_admin_uuid
            LIMIT 1;
        EXCEPTION
            WHEN invalid_text_representation THEN
                NULL; -- Not a UUID, continue
        END;
    END IF;

    -- Abort if admin not found
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin user not found: %', v_admin_email;
    END IF;

    -- Verify admin has admin role in profiles
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE auth_user_id = v_admin_id
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User % exists but does not have admin role in profiles table', v_admin_email;
    END IF;

    RAISE NOTICE 'Keeping admin user: % (ID: %)', v_admin_email, v_admin_id;

    -- Count users before deletion
    SELECT COUNT(*) INTO v_user_count FROM auth.users WHERE id != v_admin_id;
    RAISE NOTICE 'Users to delete: %', v_user_count;

    -- Delete dependent app data for all non-admin users
    -- Note: Most tables have ON DELETE CASCADE, but we'll explicitly clean up
    -- to be safe and provide visibility

    -- Delete from app tables (profiles cascade will handle most, but explicit for clarity)
    DELETE FROM profiles WHERE auth_user_id != v_admin_id;
    DELETE FROM app_users WHERE auth_user_id != v_admin_id;
    -- user_roles will cascade from app_users

    -- Delete from auth.users (this will cascade to auth.identities, etc.)
    DELETE FROM auth.users WHERE id != v_admin_id;

    -- Verify final state
    SELECT COUNT(*) INTO v_user_count FROM auth.users;
    IF v_user_count != 1 THEN
        RAISE EXCEPTION 'Expected exactly 1 user after reset, found: %', v_user_count;
    END IF;

    RAISE NOTICE '✅ User reset complete. Admin user preserved: %', v_admin_email;
END $$;

COMMIT;





