-- Add availability_mode column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS availability_mode TEXT CHECK (availability_mode IN ('additive', 'subtractive'));

-- Add comment explaining the modes
COMMENT ON COLUMN profiles.availability_mode IS 'additive: calendar sync (recommended), subtractive: manual availability (fallback/limited)';

-- Update existing vendors to additive if they have calendar connected, otherwise null or subtractive
-- For now, we leave existing as null unless we can determine intent.
-- This migration just adds the column.
