-- Enhanced Review System Migration
-- Date: 2025-08-20 19:59:35
-- Enhances the review system with multi-criteria ratings, half-star support, moderation, and provider responses

BEGIN;

-- ========================================
-- 1. ENHANCE REVIEWS TABLE
-- ========================================

-- Add new fields to existing reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS service_quality DECIMAL(2,1) CHECK (service_quality >= 0.5 AND service_quality <= 5.0),
ADD COLUMN IF NOT EXISTS communication DECIMAL(2,1) CHECK (communication >= 0.5 AND communication <= 5.0),
ADD COLUMN IF NOT EXISTS punctuality DECIMAL(2,1) CHECK (punctuality >= 0.5 AND punctuality <= 5.0),
ADD COLUMN IF NOT EXISTS value_for_money DECIMAL(2,1) CHECK (value_for_money >= 0.5 AND value_for_money <= 5.0),
ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN,
ADD COLUMN IF NOT EXISTS photos TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'flagged', 'removed')),
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
ADD COLUMN IF NOT EXISTS spam_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reported_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flagged_reason TEXT,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS overall_quality DECIMAL(2,1) GENERATED ALWAYS AS (
  CASE 
    WHEN service_quality IS NOT NULL AND communication IS NOT NULL AND punctuality IS NOT NULL AND value_for_money IS NOT NULL 
    THEN ROUND(((service_quality + communication + punctuality + value_for_money) / 4.0)::DECIMAL(2,1), 1)
    ELSE rating::DECIMAL(2,1)
  END
) STORED;

-- Update existing rating field to support half-stars
ALTER TABLE reviews 
ALTER COLUMN rating TYPE DECIMAL(2,1),
ADD CONSTRAINT reviews_rating_check CHECK (rating >= 0.5 AND rating <= 5.0);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_spam_score ON reviews(spam_score);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_quality ON reviews(overall_quality);
CREATE INDEX IF NOT EXISTS idx_reviews_helpful_count ON reviews(helpful_count);

-- ========================================
-- 2. CREATE REVIEW RESPONSES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for review responses
CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_provider_id ON review_responses(provider_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_status ON review_responses(status);

-- ========================================
-- 3. CREATE REVIEW MODERATION TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS review_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'flag', 'remove', 'restore')),
    reason TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for moderation log
CREATE INDEX IF NOT EXISTS idx_review_moderation_log_review_id ON review_moderation_log(review_id);
CREATE INDEX IF NOT EXISTS idx_review_moderation_log_moderator_id ON review_moderation_log(moderator_id);
CREATE INDEX IF NOT EXISTS idx_review_moderation_log_action ON review_moderation_log(action);

-- ========================================
-- 4. CREATE REVIEW ANALYTICS VIEWS
-- ========================================

-- View for provider review analytics
CREATE OR REPLACE VIEW provider_review_analytics AS
SELECT 
    p.id as provider_id,
    p.full_name as provider_name,
    COUNT(r.id) as total_reviews,
    COUNT(CASE WHEN r.status = 'published' THEN 1 END) as published_reviews,
    COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending_reviews,
    COUNT(CASE WHEN r.status = 'flagged' THEN 1 END) as flagged_reviews,
    AVG(CASE WHEN r.status = 'published' THEN r.overall_quality END) as avg_overall_quality,
    AVG(CASE WHEN r.status = 'published' THEN r.service_quality END) as avg_service_quality,
    AVG(CASE WHEN r.status = 'published' THEN r.communication END) as avg_communication,
    AVG(CASE WHEN r.status = 'published' THEN r.punctuality END) as avg_punctuality,
    AVG(CASE WHEN r.status = 'published' THEN r.value_for_money END) as avg_value_for_money,
    COUNT(CASE WHEN r.would_recommend = true THEN 1 END) as recommendation_count,
    ROUND(
        (COUNT(CASE WHEN r.would_recommend = true THEN 1 END)::DECIMAL / 
         COUNT(CASE WHEN r.would_recommend IS NOT NULL THEN 1 END)::DECIMAL) * 100, 1
    ) as recommendation_percentage,
    COUNT(CASE WHEN r.rating >= 4.0 THEN 1 END) as positive_reviews,
    COUNT(CASE WHEN r.rating <= 2.0 THEN 1 END) as negative_reviews,
    COUNT(CASE WHEN r.rating = 3.0 THEN 1 END) as neutral_reviews,
    MAX(r.created_at) as last_review_date,
    MIN(r.created_at) as first_review_date
FROM profiles p
LEFT JOIN reviews r ON p.id = r.provider_id
WHERE p.role = 'vendor'
GROUP BY p.id, p.full_name;

-- View for review distribution analytics
CREATE OR REPLACE VIEW review_distribution_analytics AS
SELECT 
    provider_id,
    rating,
    COUNT(*) as count,
    ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (PARTITION BY provider_id)) * 100, 1) as percentage
FROM reviews 
WHERE status = 'published'
GROUP BY provider_id, rating
ORDER BY provider_id, rating DESC;

-- ========================================
-- 5. CREATE FUNCTIONS FOR AUTOMATED PROCESSING
-- ========================================

-- Function to calculate overall quality from detailed ratings
CREATE OR REPLACE FUNCTION calculate_overall_quality(
    service_quality DECIMAL(2,1),
    communication DECIMAL(2,1),
    punctuality DECIMAL(2,1),
    value_for_money DECIMAL(2,1)
) RETURNS DECIMAL(2,1) AS $$
BEGIN
    IF service_quality IS NOT NULL AND communication IS NOT NULL AND 
       punctuality IS NOT NULL AND value_for_money IS NOT NULL THEN
        RETURN ROUND(((service_quality + communication + punctuality + value_for_money) / 4.0)::DECIMAL(2,1), 1);
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update provider rating statistics
CREATE OR REPLACE FUNCTION update_provider_rating_stats(provider_uuid UUID) RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_reviews INTEGER;
    rating_dist JSONB;
BEGIN
    -- Get published reviews only
    SELECT 
        COUNT(*),
        AVG(overall_quality),
        jsonb_build_object(
            '5', COUNT(CASE WHEN overall_quality >= 4.5 THEN 1 END),
            '4', COUNT(CASE WHEN overall_quality >= 3.5 AND overall_quality < 4.5 THEN 1 END),
            '3', COUNT(CASE WHEN overall_quality >= 2.5 AND overall_quality < 3.5 THEN 1 END),
            '2', COUNT(CASE WHEN overall_quality >= 1.5 AND overall_quality < 2.5 THEN 1 END),
            '1', COUNT(CASE WHEN overall_quality < 1.5 THEN 1 END)
        )
    INTO total_reviews, avg_rating, rating_dist
    FROM reviews 
    WHERE provider_id = provider_uuid AND status = 'published';

    -- Update provider profile
    UPDATE profiles 
    SET 
        rating = COALESCE(avg_rating, 0),
        updated_at = NOW()
    WHERE id = provider_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to detect potential spam reviews
CREATE OR REPLACE FUNCTION calculate_spam_score(
    review_text TEXT,
    user_id UUID,
    provider_id UUID,
    rating DECIMAL(2,1)
) RETURNS DECIMAL(3,2) AS $$
DECLARE
    score DECIMAL(3,2) := 0.0;
    user_review_count INTEGER;
    recent_reviews INTEGER;
    text_length INTEGER;
    rating_extremity DECIMAL(3,2);
BEGIN
    -- Count user's reviews for this provider
    SELECT COUNT(*) INTO user_review_count
    FROM reviews 
    WHERE reviewer_id = user_id AND provider_id = provider_id;
    
    -- Count recent reviews from this user (last 30 days)
    SELECT COUNT(*) INTO recent_reviews
    FROM reviews 
    WHERE reviewer_id = user_id AND created_at > NOW() - INTERVAL '30 days';
    
    -- Text analysis
    text_length := COALESCE(LENGTH(review_text), 0);
    
    -- Rating extremity (very high or very low ratings might be suspicious)
    rating_extremity := CASE 
        WHEN rating = 5.0 OR rating = 0.5 THEN 0.3
        WHEN rating = 4.5 OR rating = 1.0 THEN 0.2
        ELSE 0.0
    END;
    
    -- Calculate spam score
    score := score + 
        (user_review_count * 0.1) +           -- Multiple reviews for same provider
        (recent_reviews * 0.2) +              -- Too many recent reviews
        (CASE WHEN text_length < 10 THEN 0.3 ELSE 0.0 END) +  -- Very short text
        rating_extremity;                      -- Extreme ratings
    
    -- Cap at 1.0
    RETURN LEAST(score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. UPDATE ROW LEVEL SECURITY POLICIES
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews for completed bookings" ON reviews;

-- Create enhanced RLS policies
CREATE POLICY "reviews_select_policy" ON reviews
    FOR SELECT USING (
        status = 'published' OR 
        auth.uid() = reviewer_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "reviews_insert_policy" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        status = 'pending'
    );

CREATE POLICY "reviews_update_policy" ON reviews
    FOR UPDATE USING (
        auth.uid() = reviewer_id OR
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS policies for review responses
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_responses_select_policy" ON review_responses
    FOR SELECT USING (
        status = 'published' OR
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "review_responses_insert_policy" ON review_responses
    FOR INSERT WITH CHECK (
        auth.uid() = provider_id
    );

CREATE POLICY "review_responses_update_policy" ON review_responses
    FOR UPDATE USING (
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS policies for moderation log
ALTER TABLE review_moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation_log_select_policy" ON review_moderation_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "moderation_log_insert_policy" ON review_moderation_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ========================================
-- 7. CREATE TRIGGERS
-- ========================================

-- Trigger to automatically update provider rating stats
CREATE OR REPLACE FUNCTION trigger_update_provider_rating_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        PERFORM update_provider_rating_stats(COALESCE(NEW.provider_id, OLD.provider_id));
        RETURN COALESCE(NEW, OLD);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reviews_provider_rating_stats
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_provider_rating_stats();

-- Trigger to automatically calculate spam score
CREATE OR REPLACE FUNCTION trigger_calculate_spam_score() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        NEW.spam_score := calculate_spam_score(
            NEW.comment, 
            NEW.reviewer_id, 
            NEW.provider_id, 
            NEW.rating
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reviews_spam_score
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_spam_score();

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

GRANT SELECT ON provider_review_analytics TO authenticated;
GRANT SELECT ON review_distribution_analytics TO authenticated;
GRANT ALL ON review_responses TO authenticated;
GRANT ALL ON review_moderation_log TO authenticated;

COMMIT;

<<<<<<< HEAD

=======
>>>>>>> cabcd21e4478cfabeefaf7d414b823f4652e3fa9

