-- Delete all users from Bookiji database
-- This will cascade delete all related data (profiles, bookings, etc.)
-- Use this to restart from scratch

-- Delete all users from auth.users
-- This will cascade to:
-- - profiles (ON DELETE CASCADE)
-- - app_users (ON DELETE CASCADE)
-- - bookings (via profiles)
-- - reviews, ratings, notifications, etc. (all have CASCADE or SET NULL)

-- Note: This runs with elevated privileges in migrations, so RLS is bypassed
DELETE FROM auth.users;

-- Log the deletion
DO $$
BEGIN
    RAISE NOTICE 'All users deleted from Bookiji database. Database is now ready for fresh start.';
END $$;


