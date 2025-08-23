-- Enhanced Review System Migration
-- This migration safely upgrades the existing reviews table without data loss

-- Step 1: Create backup of existing reviews data
CREATE TABLE IF NOT EXISTS reviews_backup AS SELECT * FROM reviews;

-- Step 2: Add new columns with default values to preserve existing data
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS service_quality DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS communication DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS punctuality DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS value_for_money DECIMAL(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'flagged', 'removed')),
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
ADD COLUMN IF NOT EXISTS spam_score DECIMAL(3,2) DEFAULT 0.00 CHECK (spam_score >= 0.00 AND spam_score <= 1.00),
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
ADD COLUMN IF NOT EXISTS reported_count INTEGER DEFAULT 0 CHECK (reported_count >= 0),
ADD COLUMN IF NOT EXISTS flagged_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS moderated_by UUID DEFAULT NULL REFERENCES profiles(id);

-- Step 3: Update existing reviews to have proper status and moderation_status
UPDATE reviews 
SET status = 'published', 
    moderation_status = 'approved',
    moderated_at = created_at,
    moderated_by = (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
WHERE status IS NULL OR moderation_status IS NULL;

-- Step 4: Backfill missing rating data for existing reviews
-- Convert old single rating to service_quality and set overall quality
UPDATE reviews 
SET service_quality = rating::DECIMAL(2,1),
    communication = rating::DECIMAL(2,1),
    punctuality = rating::DECIMAL(2,1),
    value_for_money = rating::DECIMAL(2,1),
    would_recommend = CASE WHEN rating >= 4 THEN true ELSE false END
WHERE service_quality IS NULL;

-- Step 5: Change rating column type to support half-stars
-- First, ensure all existing ratings are valid
UPDATE reviews SET rating = 5.0 WHERE rating > 5;
UPDATE reviews SET rating = 1.0 WHERE rating < 1;

-- Now alter the column type
ALTER TABLE reviews 
ALTER COLUMN rating TYPE DECIMAL(2,1) USING rating::DECIMAL(2,1);

-- Step 6: Add constraints for half-star support
ALTER TABLE reviews 
ADD CONSTRAINT reviews_rating_half_star_check 
CHECK (rating >= 1.0 AND rating <= 5.0 AND (rating * 2)::INTEGER = rating * 2);

ALTER TABLE reviews 
ADD CONSTRAINT reviews_service_quality_half_star_check 
CHECK (service_quality IS NULL OR (service_quality >= 1.0 AND service_quality <= 5.0 AND (service_quality * 2)::INTEGER = service_quality * 2));

ALTER TABLE reviews 
ADD CONSTRAINT reviews_communication_half_star_check 
CHECK (communication IS NULL OR (communication >= 1.0 AND communication <= 5.0 AND (communication * 2)::INTEGER = communication * 2));

ALTER TABLE reviews 
ADD CONSTRAINT reviews_punctuality_half_star_check 
CHECK (punctuality IS NULL OR (punctuality >= 1.0 AND punctuality <= 5.0 AND (punctuality * 2)::INTEGER = punctuality * 2));

ALTER TABLE reviews 
ADD CONSTRAINT reviews_value_for_money_half_star_check 
CHECK (value_for_money IS NULL OR (value_for_money >= 1.0 AND value_for_money <= 5.0 AND (value_for_money * 2)::INTEGER = value_for_money * 2));

-- Step 7: Add overall_quality generated column
ALTER TABLE reviews 
ADD COLUMN overall_quality DECIMAL(2,1) GENERATED ALWAYS AS (
  CASE 
    WHEN service_quality IS NOT NULL AND communication IS NOT NULL AND punctuality IS NOT NULL AND value_for_money IS NOT NULL THEN
      ROUND(((service_quality + communication + punctuality + value_for_money) / 4.0)::DECIMAL(2,1), 1)
    ELSE rating
  END
) STORED;

-- Step 8: Create review_responses table
CREATE TABLE IF NOT EXISTS review_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL CHECK (char_length(response_text) >= 10 AND char_length(response_text) <= 2000),
    is_public BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id, provider_id)
);

-- Step 9: Create review_moderation_log table
CREATE TABLE IF NOT EXISTS review_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'flag', 'remove', 'restore')),
    reason TEXT,
    previous_status TEXT,
    new_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 10: Create analytics views
CREATE OR REPLACE VIEW provider_review_analytics AS
SELECT 
    provider_id,
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE status = 'published') as published_reviews,
    ROUND(AVG(overall_quality) FILTER (WHERE status = 'published'), 2) as avg_overall_quality,
    ROUND(AVG(service_quality) FILTER (WHERE status = 'published'), 2) as avg_service_quality,
    ROUND(AVG(communication) FILTER (WHERE status = 'published'), 2) as avg_communication,
    ROUND(AVG(punctuality) FILTER (WHERE status = 'published'), 2) as avg_punctuality,
    ROUND(AVG(value_for_money) FILTER (WHERE status = 'published'), 2) as avg_value_for_money,
    ROUND((COUNT(*) FILTER (WHERE would_recommend = true)::DECIMAL / COUNT(*) FILTER (WHERE status = 'published')) * 100, 1) as recommendation_rate,
    ROUND(AVG(spam_score), 3) as avg_spam_score
FROM reviews 
GROUP BY provider_id;

CREATE OR REPLACE VIEW review_distribution_analytics AS
SELECT 
    provider_id,
    CASE 
        WHEN overall_quality >= 4.5 THEN '4.5-5.0'
        WHEN overall_quality >= 4.0 THEN '4.0-4.4'
        WHEN overall_quality >= 3.5 THEN '3.5-3.9'
        WHEN overall_quality >= 3.0 THEN '3.0-3.4'
        WHEN overall_quality >= 2.5 THEN '2.5-2.9'
        WHEN overall_quality >= 2.0 THEN '2.0-2.4'
        WHEN overall_quality >= 1.5 THEN '1.5-1.9'
        ELSE '1.0-1.4'
    END as rating_range,
    COUNT(*) as count,
    ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (PARTITION BY provider_id)) * 100, 1) as percentage
FROM reviews 
WHERE status = 'published' AND overall_quality IS NOT NULL
GROUP BY provider_id, rating_range
ORDER BY provider_id, rating_range DESC;

-- Step 11: Create functions for automated processing
CREATE OR REPLACE FUNCTION calculate_overall_quality(
    service_quality DECIMAL(2,1),
    communication DECIMAL(2,1),
    punctuality DECIMAL(2,1),
    value_for_money DECIMAL(2,1)
) RETURNS DECIMAL(2,1) AS $$
BEGIN
    IF service_quality IS NULL OR communication IS NULL OR punctuality IS NULL OR value_for_money IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND(((service_quality + communication + punctuality + value_for_money) / 4.0)::DECIMAL(2,1), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_provider_rating_stats(provider_id_param UUID) RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(2,1);
    rating_distribution JSONB;
BEGIN
    -- Calculate average rating from published reviews
    SELECT ROUND(AVG(overall_quality), 2)
    INTO avg_rating
    FROM reviews 
    WHERE provider_id = provider_id_param AND status = 'published';
    
    -- Calculate rating distribution
    SELECT jsonb_object_agg(
        rating_range, 
        jsonb_build_object('count', count, 'percentage', percentage)
    )
    INTO rating_distribution
    FROM (
        SELECT 
            CASE 
                WHEN overall_quality >= 4.5 THEN '4.5-5.0'
                WHEN overall_quality >= 4.0 THEN '4.0-4.4'
                WHEN overall_quality >= 3.5 THEN '3.5-3.9'
                WHEN overall_quality >= 3.0 THEN '3.0-3.4'
                WHEN overall_quality >= 2.5 THEN '2.5-2.9'
                WHEN overall_quality >= 2.0 THEN '2.0-2.4'
                WHEN overall_quality >= 1.5 THEN '1.5-1.9'
                ELSE '1.0-1.4'
            END as rating_range,
            COUNT(*) as count,
            ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER ()) * 100, 1) as percentage
        FROM reviews 
        WHERE provider_id = provider_id_param AND status = 'published'
        GROUP BY rating_range
        ORDER BY rating_range DESC
    ) dist;
    
    -- Update profiles table
    UPDATE profiles 
    SET 
        rating = COALESCE(avg_rating, 0.0),
        updated_at = NOW()
    WHERE id = provider_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_spam_score(
    review_text TEXT,
    reviewer_id UUID,
    provider_id UUID
) RETURNS DECIMAL(3,2) AS $$
DECLARE
    spam_score DECIMAL(3,2) := 0.0;
    suspicious_patterns INTEGER := 0;
    review_count INTEGER;
    avg_rating DECIMAL(2,1);
BEGIN
    -- Basic spam detection patterns (to be enhanced with AI)
    
    -- Check for suspicious text patterns
    IF review_text IS NOT NULL THEN
        -- Excessive capitalization
        IF length(review_text) > 0 AND (length(review_text) - length(lower(review_text))) / length(review_text)::DECIMAL > 0.3 THEN
            suspicious_patterns := suspicious_patterns + 1;
        END IF;
        
        -- Repeated characters
        IF review_text ~ '([a-zA-Z])\1{2,}' THEN
            suspicious_patterns := suspicious_patterns + 1;
        END IF;
        
        -- Suspicious keywords
        IF review_text ~* '\b(free|money|cash|earn|profit|investment|opportunity|work from home|make money|get rich)\b' THEN
            suspicious_patterns := suspicious_patterns + 2;
        END IF;
    END IF;
    
    -- Check reviewer behavior patterns
    SELECT COUNT(*), AVG(rating)
    INTO review_count, avg_rating
    FROM reviews 
    WHERE reviewer_id = calculate_spam_score.reviewer_id;
    
    -- Multiple reviews from same user in short time
    IF review_count > 10 THEN
        suspicious_patterns := suspicious_patterns + 1;
    END IF;
    
    -- All 5-star reviews (potential fake reviews)
    IF review_count > 5 AND avg_rating = 5.0 THEN
        suspicious_patterns := suspicious_patterns + 2;
    END IF;
    
    -- Calculate final spam score (0.0 to 1.0)
    spam_score := LEAST(suspicious_patterns * 0.15, 1.0);
    
    RETURN ROUND(spam_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create triggers for automated updates
CREATE OR REPLACE FUNCTION trigger_reviews_provider_rating_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_provider_rating_stats(NEW.provider_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.provider_id != NEW.provider_id THEN
            PERFORM update_provider_rating_stats(OLD.provider_id);
        END IF;
        PERFORM update_provider_rating_stats(NEW.provider_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_provider_rating_stats(OLD.provider_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_reviews_spam_score() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.spam_score IS NULL THEN
        NEW.spam_score := calculate_spam_score(NEW.comment, NEW.reviewer_id, NEW.provider_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_reviews_provider_rating_stats ON reviews;
CREATE TRIGGER trigger_reviews_provider_rating_stats
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_reviews_provider_rating_stats();

DROP TRIGGER IF EXISTS trigger_reviews_spam_score ON reviews;
CREATE TRIGGER trigger_reviews_spam_score
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trigger_reviews_spam_score();

-- Step 13: Update RLS policies
DROP POLICY IF EXISTS "Users can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

CREATE POLICY "Users can view published reviews" ON reviews
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- Admin policies
CREATE POLICY "Admins can manage all reviews" ON reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Provider policies for responses
CREATE POLICY "Providers can view responses to their reviews" ON review_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM reviews 
            WHERE id = review_id AND provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can create responses to their reviews" ON review_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM reviews 
            WHERE id = review_id AND provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can update their own responses" ON review_responses
    FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete their own responses" ON review_responses
    FOR DELETE USING (provider_id = auth.uid());

-- Admin policies for responses
CREATE POLICY "Admins can manage all responses" ON review_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Moderation log policies
CREATE POLICY "Admins can view moderation logs" ON review_moderation_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can create moderation logs" ON review_moderation_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 14: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON review_responses TO authenticated;
GRANT SELECT, INSERT ON review_moderation_log TO authenticated;
GRANT SELECT ON provider_review_analytics TO authenticated;
GRANT SELECT ON review_distribution_analytics TO authenticated;

-- Step 15: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_spam_score ON reviews(spam_score);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_quality ON reviews(overall_quality);

CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_provider_id ON review_responses(provider_id);

CREATE INDEX IF NOT EXISTS idx_review_moderation_log_review_id ON review_moderation_log(review_id);
CREATE INDEX IF NOT EXISTS idx_review_moderation_log_moderator_id ON review_moderation_log(moderator_id);
CREATE INDEX IF NOT EXISTS idx_review_moderation_log_created_at ON review_moderation_log(created_at);

-- Step 16: Verify migration success
DO $$
BEGIN
    -- Check that all existing reviews have been properly migrated
    IF EXISTS (
        SELECT 1 FROM reviews 
        WHERE status IS NULL OR moderation_status IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration failed: Some reviews still have NULL status or moderation_status';
    END IF;
    
    -- Check that overall_quality is calculated for reviews with detailed ratings
    IF EXISTS (
        SELECT 1 FROM reviews 
        WHERE service_quality IS NOT NULL 
        AND communication IS NOT NULL 
        AND punctuality IS NOT NULL 
        AND value_for_money IS NOT NULL 
        AND overall_quality IS NULL
    ) THEN
        RAISE EXCEPTION 'Migration failed: overall_quality not calculated for detailed reviews';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

