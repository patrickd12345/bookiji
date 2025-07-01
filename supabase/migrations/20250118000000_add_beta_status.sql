-- Add beta_status column to profiles table
ALTER TABLE profiles ADD COLUMN beta_status JSONB DEFAULT NULL;

-- Create index for better performance when querying beta users
CREATE INDEX idx_profiles_beta_status ON profiles USING GIN (beta_status);

-- Function to check if user is in beta
CREATE OR REPLACE FUNCTION is_beta_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND beta_status IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific beta feature
CREATE OR REPLACE FUNCTION has_beta_feature(user_id UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND (
      beta_status->>'type' = 'early_access'
      OR feature_name = ANY(ARRAY(SELECT jsonb_array_elements_text(beta_status->'features')))
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 