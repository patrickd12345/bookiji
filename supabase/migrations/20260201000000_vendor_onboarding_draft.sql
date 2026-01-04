-- Add onboarding tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'start',
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Create index for onboarding analysis
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_step ON profiles(onboarding_step);
