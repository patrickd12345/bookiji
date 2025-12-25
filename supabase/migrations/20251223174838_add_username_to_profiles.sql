-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN username TEXT;

-- Add unique constraint to username
-- We allow NULLs (Postgres allows multiple NULLs in unique columns by default)
ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Create index for faster lookups during login
CREATE INDEX idx_profiles_username ON profiles(username);

-- Optional: Add a check constraint to ensure username format (e.g., length, characters)
-- For now, we'll keep it simple, but we could add:
-- ALTER TABLE profiles ADD CONSTRAINT username_format_check CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$');





