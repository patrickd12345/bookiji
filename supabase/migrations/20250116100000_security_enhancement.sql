-- 🔐 CRITICAL SECURITY ENHANCEMENT MIGRATION
-- Essential security fixes for production readiness

-- =======================
-- SECURITY LOGGING TABLE
-- =======================
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL, -- 'login', 'failed_login', 'admin_access', 'permission_denied'
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast security queries
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

-- =======================
-- RATE LIMITING TABLE
-- =======================
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier VARCHAR(255) NOT NULL, -- IP address or user ID
  action_type VARCHAR(50) NOT NULL, -- 'login', 'api_call', 'booking'
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON rate_limits(identifier, action_type);

-- =======================
-- SESSION MANAGEMENT TABLE
-- =======================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- =======================
-- ADMIN PERMISSIONS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Unique constraint for user-permission pairs
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_permissions_user_permission 
ON admin_permissions(user_id, permission) WHERE is_active = true;

-- =======================
-- ENHANCED PROFILES TABLE UPDATES
-- =======================

-- Add security-related columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 2555; -- 7 years

-- =======================
-- ROW LEVEL SECURITY POLICIES
-- =======================

-- Enable RLS on all security tables
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Security logs: Only admins can read, system can insert
DROP POLICY IF EXISTS "security_logs_admin_read" ON security_logs;
CREATE POLICY "security_logs_admin_read" ON security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "security_logs_system_insert" ON security_logs;
CREATE POLICY "security_logs_system_insert" ON security_logs
  FOR INSERT WITH CHECK (true); -- System-level inserts

-- Rate limits: Users can read their own, admins can read all
DROP POLICY IF EXISTS "rate_limits_user_read" ON rate_limits;
CREATE POLICY "rate_limits_user_read" ON rate_limits
  FOR SELECT USING (
    identifier = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- User sessions: Users can manage their own sessions
DROP POLICY IF EXISTS "user_sessions_own" ON user_sessions;
CREATE POLICY "user_sessions_own" ON user_sessions
  FOR ALL USING (user_id = auth.uid());

-- Admin permissions: Only readable by the user themselves and other admins
DROP POLICY IF EXISTS "admin_permissions_read" ON admin_permissions;
CREATE POLICY "admin_permissions_read" ON admin_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =======================
-- ENHANCED PROFILE SECURITY
-- =======================

-- Update profiles RLS to be more secure
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (
    -- Users can read their own profile
    id = auth.uid() OR
    -- Customers can see basic vendor info (for bookings)
    (role = 'vendor' AND auth.uid() IS NOT NULL) OR
    -- Admins can see all profiles
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  );

-- =======================
-- SECURE FUNCTIONS
-- =======================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type VARCHAR(50),
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO security_logs (event_type, user_id, ip_address, user_agent, metadata)
  VALUES (p_event_type, p_user_id, p_ip_address::INET, p_user_agent, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier VARCHAR(255),
  p_action_type VARCHAR(50),
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
DECLARE
  current_attempts INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current attempts in window
  SELECT COALESCE(attempts, 0) INTO current_attempts
  FROM rate_limits
  WHERE identifier = p_identifier 
    AND action_type = p_action_type
    AND last_attempt > window_start;
  
  -- Check if blocked
  IF current_attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO rate_limits (identifier, action_type, attempts, last_attempt)
  VALUES (p_identifier, p_action_type, 1, NOW())
  ON CONFLICT (identifier, action_type)
  DO UPDATE SET 
    attempts = CASE 
      WHEN rate_limits.last_attempt > window_start THEN rate_limits.attempts + 1
      ELSE 1
    END,
    last_attempt = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify admin access
CREATE OR REPLACE FUNCTION verify_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id 
      AND role = 'admin'
      AND is_suspended = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- TRIGGERS FOR SECURITY LOGGING
-- =======================

-- Trigger to log profile updates
CREATE OR REPLACE FUNCTION trigger_log_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Log security-sensitive profile changes
  IF OLD.role != NEW.role OR OLD.is_suspended != NEW.is_suspended THEN
    PERFORM log_security_event(
      'profile_security_change',
      NEW.id,
      NULL,
      NULL,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_suspended', OLD.is_suspended,
        'new_suspended', NEW.is_suspended
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_profile_security_changes ON profiles;
CREATE TRIGGER trigger_log_profile_security_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_profile_update();

-- =======================
-- CLEANUP FUNCTIONS
-- =======================

-- Function to clean up old security logs (run via cron)
CREATE OR REPLACE FUNCTION cleanup_security_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() OR is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- GRANTS AND PERMISSIONS
-- =======================

-- Grant necessary permissions for the application
GRANT SELECT, INSERT ON security_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON rate_limits TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT SELECT ON admin_permissions TO authenticated;

-- Grant admin functions to authenticated users (RLS will control access)
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_user TO authenticated;

COMMENT ON TABLE security_logs IS 'Comprehensive security event logging for audit trails';
COMMENT ON TABLE rate_limits IS 'Rate limiting to prevent abuse and attacks';
COMMENT ON TABLE user_sessions IS 'Enhanced session management and tracking';
COMMENT ON TABLE admin_permissions IS 'Granular admin permission management'; 