-- Extend users table with rich profile fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS portfolio_images TEXT[],
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS professional_summary TEXT,
ADD COLUMN IF NOT EXISTS service_area_radius INTEGER DEFAULT 10, -- in km
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_documents TEXT[],
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS response_time_avg INTEGER DEFAULT 0, -- in minutes
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0;

-- Create certifications table for structured certification data
CREATE TABLE IF NOT EXISTS provider_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certification_name VARCHAR(255) NOT NULL,
  issuing_organization VARCHAR(255) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  certificate_number VARCHAR(100),
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create education table for structured education data
CREATE TABLE IF NOT EXISTS provider_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_name VARCHAR(255) NOT NULL,
  degree_type VARCHAR(100), -- 'bachelor', 'master', 'phd', 'diploma', 'certificate', etc.
  field_of_study VARCHAR(255),
  start_year INTEGER,
  end_year INTEGER,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create portfolio table for showcasing work
CREATE TABLE IF NOT EXISTS provider_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  service_type VARCHAR(100),
  images TEXT[],
  project_date DATE,
  client_name VARCHAR(255), -- anonymized if needed
  project_duration VARCHAR(100), -- e.g., "2 weeks", "1 month"
  technologies_used TEXT[],
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create languages table for better language management
CREATE TABLE IF NOT EXISTS provider_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL, -- ISO 639-1 codes
  language_name VARCHAR(100) NOT NULL,
  proficiency_level VARCHAR(50) NOT NULL CHECK (proficiency_level IN ('basic', 'conversational', 'fluent', 'native')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider reviews aggregation view
CREATE OR REPLACE VIEW provider_profile_summary AS
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.bio,
  u.portfolio_images,
  u.certifications,
  u.languages,
  u.specializations,
  u.experience_years,
  u.hourly_rate,
  u.professional_summary,
  u.service_area_radius,
  u.verified_at,
  u.rating,
  u.profile_completion_score,
  u.response_time_avg,
  u.completion_rate,
  u.created_at,
  
  -- Aggregated data
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
  COUNT(DISTINCT r.id) as total_reviews,
  AVG(r.rating) as avg_review_rating,
  COUNT(DISTINCT pc.id) as certification_count,
  COUNT(DISTINCT pe.id) as education_count,
  COUNT(DISTINCT pp.id) as portfolio_count,
  COUNT(DISTINCT pl.id) as language_count,
  
  -- Recent activity
  MAX(b.created_at) as last_booking_date,
  MAX(r.created_at) as last_review_date,
  
  -- Service statistics
  array_agg(DISTINCT s.service_type) FILTER (WHERE s.service_type IS NOT NULL) as service_types,
  AVG(s.base_price) as avg_service_price,
  COUNT(DISTINCT s.id) as active_services
  
FROM users u
LEFT JOIN bookings b ON u.id = b.provider_id
LEFT JOIN reviews r ON u.id = r.provider_id
LEFT JOIN provider_certifications pc ON u.id = pc.provider_id AND pc.verification_status = 'verified'
LEFT JOIN provider_education pe ON u.id = pe.provider_id
LEFT JOIN provider_portfolio pp ON u.id = pp.provider_id
LEFT JOIN provider_languages pl ON u.id = pl.provider_id
LEFT JOIN services s ON u.id = s.provider_id AND s.is_active = true
WHERE u.role = 'provider'
GROUP BY u.id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_certifications_provider_id ON provider_certifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_certifications_status ON provider_certifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_education_provider_id ON provider_education(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_portfolio_provider_id ON provider_portfolio(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_portfolio_featured ON provider_portfolio(is_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_provider_languages_provider_id ON provider_languages(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_completion ON users(profile_completion_score) WHERE role = 'provider';
CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verified_at) WHERE role = 'provider';

-- Create function to calculate profile completion score
CREATE OR REPLACE FUNCTION calculate_profile_completion_score(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  user_data RECORD;
  cert_count INTEGER;
  edu_count INTEGER;
  portfolio_count INTEGER;
  lang_count INTEGER;
BEGIN
  -- Get user data
  SELECT * INTO user_data FROM users WHERE id = user_id AND role = 'provider';
  
  IF user_data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Basic profile fields (40 points total)
  IF user_data.full_name IS NOT NULL AND user_data.full_name != '' THEN score := score + 5; END IF;
  IF user_data.bio IS NOT NULL AND user_data.bio != '' THEN score := score + 10; END IF;
  IF user_data.professional_summary IS NOT NULL AND user_data.professional_summary != '' THEN score := score + 10; END IF;
  IF user_data.experience_years > 0 THEN score := score + 5; END IF;
  IF user_data.hourly_rate > 0 THEN score := score + 5; END IF;
  IF user_data.service_area_radius > 0 THEN score := score + 5; END IF;
  
  -- Profile image (10 points)
  IF user_data.avatar_url IS NOT NULL AND user_data.avatar_url != '' THEN score := score + 10; END IF;
  
  -- Specializations and languages (20 points)
  IF array_length(user_data.specializations, 1) > 0 THEN score := score + 10; END IF;
  IF array_length(user_data.languages, 1) > 0 THEN score := score + 10; END IF;
  
  -- Portfolio images (10 points)
  IF array_length(user_data.portfolio_images, 1) > 0 THEN score := score + 10; END IF;
  
  -- Certifications (10 points)
  SELECT COUNT(*) INTO cert_count FROM provider_certifications 
  WHERE provider_id = user_id AND verification_status = 'verified';
  IF cert_count > 0 THEN score := score + 10; END IF;
  
  -- Education (5 points)
  SELECT COUNT(*) INTO edu_count FROM provider_education WHERE provider_id = user_id;
  IF edu_count > 0 THEN score := score + 5; END IF;
  
  -- Portfolio projects (5 points)
  SELECT COUNT(*) INTO portfolio_count FROM provider_portfolio WHERE provider_id = user_id;
  IF portfolio_count > 0 THEN score := score + 5; END IF;
  
  -- Max score is 100
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update profile completion score
CREATE OR REPLACE FUNCTION update_profile_completion_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE users 
    SET profile_completion_score = calculate_profile_completion_score(NEW.provider_id),
        updated_at = NOW()
    WHERE id = NEW.provider_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users 
    SET profile_completion_score = calculate_profile_completion_score(OLD.provider_id),
        updated_at = NOW()
    WHERE id = OLD.provider_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table updates
CREATE OR REPLACE TRIGGER trigger_update_profile_completion_users
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.role = 'provider')
  EXECUTE FUNCTION update_profile_completion_score();

-- Create triggers for related tables
CREATE TRIGGER trigger_update_profile_completion_certifications
  AFTER INSERT OR UPDATE OR DELETE ON provider_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_score();

CREATE TRIGGER trigger_update_profile_completion_education
  AFTER INSERT OR UPDATE OR DELETE ON provider_education
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_score();

CREATE TRIGGER trigger_update_profile_completion_portfolio
  AFTER INSERT OR UPDATE OR DELETE ON provider_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completion_score();

-- Enable RLS on new tables
ALTER TABLE provider_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_languages ENABLE ROW LEVEL SECURITY;

-- RLS policies for provider_certifications
CREATE POLICY "Providers can manage own certifications" ON provider_certifications
  FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Anyone can view verified certifications" ON provider_certifications
  FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Admins can manage all certifications" ON provider_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS policies for provider_education
CREATE POLICY "Providers can manage own education" ON provider_education
  FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Anyone can view education" ON provider_education
  FOR SELECT USING (true);

-- RLS policies for provider_portfolio
CREATE POLICY "Providers can manage own portfolio" ON provider_portfolio
  FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Anyone can view portfolio" ON provider_portfolio
  FOR SELECT USING (true);

-- RLS policies for provider_languages
CREATE POLICY "Providers can manage own languages" ON provider_languages
  FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Anyone can view languages" ON provider_languages
  FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_certifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_education TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_portfolio TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_languages TO authenticated;
GRANT SELECT ON provider_profile_summary TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completion_score TO authenticated;

-- Update existing provider profiles to calculate initial scores
UPDATE users 
SET profile_completion_score = calculate_profile_completion_score(id),
    updated_at = NOW()
WHERE role = 'provider';
