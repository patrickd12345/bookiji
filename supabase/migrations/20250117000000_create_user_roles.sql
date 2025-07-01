-- Create user_roles table for multi-role support
-- This allows users to have multiple roles (customer, vendor, admin)

CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('customer', 'vendor', 'admin')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own roles (for self-registration)
CREATE POLICY "Users can insert their own roles" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own roles
CREATE POLICY "Users can update their own roles" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own roles
CREATE POLICY "Users can delete their own roles" ON user_roles
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Create a view for easy querying of user roles
CREATE OR REPLACE VIEW user_role_summary AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  ARRAY_AGG(ur.role ORDER BY ur.role) as roles,
  CASE 
    WHEN 'customer' = ANY(ARRAY_AGG(ur.role)) THEN true 
    ELSE false 
  END as can_book_services,
  CASE 
    WHEN 'vendor' = ANY(ARRAY_AGG(ur.role)) THEN true 
    ELSE false 
  END as can_offer_services,
  CASE 
    WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN true 
    ELSE false 
  END as is_admin,
  p.created_at,
  p.updated_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.email, p.full_name, p.created_at, p.updated_at;

-- Grant permissions on the view
GRANT SELECT ON user_role_summary TO authenticated;

-- Create a function to add default customer role when user signs up
CREATE OR REPLACE FUNCTION add_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Add customer role by default for new users
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add customer role for new users
CREATE TRIGGER add_default_role_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_default_user_role();

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(check_user_id UUID, check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add role to user
CREATE OR REPLACE FUNCTION add_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove role from user
CREATE OR REPLACE FUNCTION remove_user_role(target_user_id UUID, old_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_roles 
  WHERE user_id = target_user_id 
  AND role = old_role;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 