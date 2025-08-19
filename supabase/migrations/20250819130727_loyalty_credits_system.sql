-- Loyalty & Credits System Migration
-- This migration adds a complete credits system with earning rules, transaction history, and admin controls

-- 1. Add credits_balance to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits_earned DECIMAL(10,2) DEFAULT 0.00 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_credits_spent DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

-- 2. Create credits_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credits_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'refund', 'admin_adjustment')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT, -- 'booking', 'referral', 'admin', etc.
    reference_id UUID, -- ID of the related record
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL -- admin who made adjustment
);

-- 3. Create credits_earning_rules table for configurable earning logic
CREATE TABLE IF NOT EXISTS credits_earning_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('percentage', 'fixed', 'tiered')),
    rule_config JSONB NOT NULL, -- flexible config for different rule types
    is_active BOOLEAN DEFAULT true NOT NULL,
    priority INTEGER DEFAULT 0 NOT NULL, -- higher priority rules apply first
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create credits_redemption_rules table for spending logic
CREATE TABLE IF NOT EXISTS credits_redemption_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('percentage', 'fixed', 'minimum_balance')),
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    applies_to TEXT[] DEFAULT '{}', -- what this rule applies to (bookings, services, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create credits_tiers table for VIP/loyalty levels
CREATE TABLE IF NOT EXISTS credits_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    tier_level INTEGER NOT NULL UNIQUE,
    min_credits_earned DECIMAL(10,2) NOT NULL,
    max_credits_earned DECIMAL(10,2),
    bonus_multiplier DECIMAL(3,2) DEFAULT 1.00, -- earn bonus credits
    discount_percentage DECIMAL(3,2) DEFAULT 0.00, -- spend discount
    benefits JSONB DEFAULT '{}', -- tier-specific benefits
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Create credits_referrals table for referral bonuses
CREATE TABLE IF NOT EXISTS credits_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    referrer_bonus DECIMAL(10,2) DEFAULT 0.00,
    referred_bonus DECIMAL(10,2) DEFAULT 0.00,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(referrer_id, referred_id)
);

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_credits_transactions_user_id ON credits_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_created_at ON credits_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_transactions_reference ON credits_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_credits_earning_rules_active ON credits_earning_rules(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_credits_redemption_rules_active ON credits_redemption_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_credits_tiers_level ON credits_tiers(tier_level);
CREATE INDEX IF NOT EXISTS idx_credits_referrals_referrer ON credits_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_credits_referrals_referred ON credits_referrals(referred_id);

-- 8. Insert default earning rules
INSERT INTO credits_earning_rules (rule_name, rule_type, rule_config, priority) VALUES
('booking_completion', 'percentage', '{"percentage": 5, "min_amount": 1.00, "max_credits": 50.00}', 1),
('referral_bonus', 'fixed', '{"amount": 10.00, "conditions": ["new_user_signup", "first_booking"]}', 2),
('loyalty_tier_bonus', 'percentage', '{"base_percentage": 5, "tier_multipliers": {"silver": 1.2, "gold": 1.5, "platinum": 2.0}}', 3);

-- 9. Insert default redemption rules
INSERT INTO credits_redemption_rules (rule_name, rule_type, rule_config, applies_to) VALUES
('minimum_balance', 'minimum_balance', '{"min_balance": 5.00}', ARRAY['bookings', 'services']),
('max_redemption_percentage', 'percentage', '{"max_percentage": 25, "min_amount": 1.00}', ARRAY['bookings']),
('tier_discount', 'percentage', '{"base_discount": 0, "tier_discounts": {"silver": 5, "gold": 10, "platinum": 15}}', ARRAY['bookings', 'services']);

-- 10. Insert default loyalty tiers
INSERT INTO credits_tiers (tier_name, tier_level, min_credits_earned, max_credits_earned, bonus_multiplier, discount_percentage, benefits) VALUES
('Bronze', 1, 0, 99.99, 1.00, 0.00, '{"description": "New users", "icon": "🥉"}'),
('Silver', 2, 100.00, 499.99, 1.20, 5.00, '{"description": "Loyal customers", "icon": "🥈", "priority_support": true}'),
('Gold', 3, 500.00, 1999.99, 1.50, 10.00, '{"description": "Premium members", "icon": "🥇", "priority_support": true, "exclusive_offers": true}'),
('Platinum', 4, 2000.00, NULL, 2.00, 15.00, '{"description": "VIP members", "icon": "💎", "priority_support": true, "exclusive_offers": true, "dedicated_manager": true}');

-- 11. Create function to calculate user tier
CREATE OR REPLACE FUNCTION get_user_credits_tier(user_credits DECIMAL)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT tier_name 
        FROM credits_tiers 
        WHERE user_credits >= min_credits_earned 
        AND (max_credits_earned IS NULL OR user_credits <= max_credits_earned)
        ORDER BY tier_level DESC 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. Create function to add credits to user
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_transaction_type TEXT,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_created_by UUID DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
    v_user_tier TEXT;
    v_bonus_multiplier DECIMAL := 1.00;
BEGIN
    -- Get current balance
    SELECT credits_balance INTO v_balance_before FROM users WHERE id = p_user_id;
    
    -- Get user tier and bonus multiplier
    SELECT tier_name, bonus_multiplier INTO v_user_tier, v_bonus_multiplier 
    FROM credits_tiers 
    WHERE min_credits_earned <= v_balance_before 
    AND (max_credits_earned IS NULL OR v_balance_before <= max_credits_earned)
    ORDER BY tier_level DESC LIMIT 1;
    
    -- Apply tier bonus for earning transactions
    IF p_transaction_type = 'earn' AND v_bonus_multiplier > 1.00 THEN
        p_amount := p_amount * v_bonus_multiplier;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_amount;
    
    -- Update user credits
    UPDATE users 
    SET 
        credits_balance = v_balance_after,
        total_credits_earned = total_credits_earned + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
        total_credits_spent = total_credits_spent + CASE WHEN p_amount < 0 THEN ABS(p_amount) ELSE 0 END
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO credits_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, reference_type, reference_id, metadata, created_by
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
        p_description, p_reference_type, p_reference_id, p_metadata, p_created_by
    );
    
    RETURN v_balance_after;
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to spend credits
CREATE OR REPLACE FUNCTION spend_user_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
    v_user_tier TEXT;
    v_discount_percentage DECIMAL := 0.00;
    v_final_amount DECIMAL;
BEGIN
    -- Get current balance
    SELECT credits_balance INTO v_balance_before FROM users WHERE id = p_user_id;
    
    -- Check if user has enough credits
    IF v_balance_before < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Get user tier and discount
    SELECT tier_name, discount_percentage INTO v_user_tier, v_discount_percentage 
    FROM credits_tiers 
    WHERE min_credits_earned <= v_balance_before 
    AND (max_credits_earned IS NULL OR v_balance_before <= max_credits_earned)
    ORDER BY tier_level DESC LIMIT 1;
    
    -- Apply tier discount
    v_final_amount := p_amount * (1 - v_discount_percentage / 100);
    
    -- Calculate new balance
    v_balance_after := v_balance_before - v_final_amount;
    
    -- Update user credits
    UPDATE users 
    SET 
        credits_balance = v_balance_after,
        total_credits_spent = total_credits_spent + v_final_amount
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO credits_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, reference_type, reference_id, metadata
    ) VALUES (
        p_user_id, 'spend', -v_final_amount, v_balance_before, v_balance_after,
        p_description, p_reference_type, p_reference_id, p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 14. Create function to process referral completion
CREATE OR REPLACE FUNCTION complete_referral(
    p_referral_id UUID,
    p_referrer_bonus DECIMAL DEFAULT 10.00,
    p_referred_bonus DECIMAL DEFAULT 5.00
)
RETURNS BOOLEAN AS $$
DECLARE
    v_referral credits_referrals%ROWTYPE;
BEGIN
    -- Get referral details
    SELECT * INTO v_referral FROM credits_referrals WHERE id = p_referral_id;
    
    -- Check if referral exists and is pending
    IF v_referral.id IS NULL OR v_referral.status != 'pending' THEN
        RETURN FALSE;
    END IF;
    
    -- Update referral status
    UPDATE credits_referrals 
    SET status = 'completed', completed_at = NOW(),
        referrer_bonus = p_referrer_bonus, referred_bonus = p_referred_bonus
    WHERE id = p_referral_id;
    
    -- Award credits to referrer
    PERFORM add_user_credits(
        v_referral.referrer_id, 
        p_referrer_bonus, 
        'earn', 
        'Referral bonus for ' || v_referral.referral_code,
        'referral', 
        p_referral_id
    );
    
    -- Award credits to referred user
    PERFORM add_user_credits(
        v_referral.referred_id, 
        p_referred_bonus, 
        'earn', 
        'Welcome bonus from referral ' || v_referral.referral_code,
        'referral', 
        p_referral_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 15. Add RLS policies for credits tables
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_earning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_redemption_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_referrals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "Users can view own credits transactions" ON credits_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own referrals
CREATE POLICY "Users can view own referrals" ON credits_referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Public read access to earning rules, redemption rules, and tiers
CREATE POLICY "Public read access to earning rules" ON credits_earning_rules
    FOR SELECT USING (true);

CREATE POLICY "Public read access to redemption rules" ON credits_redemption_rules
    FOR SELECT USING (true);

CREATE POLICY "Public read access to tiers" ON credits_tiers
    FOR SELECT USING (true);

-- Only admins can modify rules and tiers
CREATE POLICY "Admins can modify earning rules" ON credits_earning_rules
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin'));

CREATE POLICY "Admins can modify redemption rules" ON credits_redemption_rules
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin'));

CREATE POLICY "Admins can modify tiers" ON credits_tiers
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin'));

-- 16. Create view for user credits summary
CREATE OR REPLACE VIEW user_credits_summary AS
SELECT 
    u.id,
    u.email,
    u.credits_balance,
    u.total_credits_earned,
    u.total_credits_spent,
    get_user_credits_tier(u.total_credits_earned) as current_tier,
    ct.tier_level,
    ct.bonus_multiplier,
    ct.discount_percentage,
    ct.benefits,
    COUNT(ctr.id) as total_referrals,
    COUNT(CASE WHEN ctr.status = 'completed' THEN 1 END) as completed_referrals
FROM users u
LEFT JOIN credits_tiers ct ON get_user_credits_tier(u.total_credits_earned) = ct.tier_name
LEFT JOIN credits_referrals ctr ON u.id = ctr.referrer_id
GROUP BY u.id, u.email, u.credits_balance, u.total_credits_earned, u.total_credits_spent, 
         ct.tier_name, ct.tier_level, ct.bonus_multiplier, ct.discount_percentage, ct.benefits;

-- 17. Grant necessary permissions
GRANT SELECT ON user_credits_summary TO authenticated;
GRANT SELECT ON credits_transactions TO authenticated;
GRANT SELECT ON credits_earning_rules TO authenticated;
GRANT SELECT ON credits_redemption_rules TO authenticated;
GRANT SELECT ON credits_tiers TO authenticated;
GRANT SELECT ON credits_referrals TO authenticated;

-- 18. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credits_earning_rules_updated_at 
    BEFORE UPDATE ON credits_earning_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_redemption_rules_updated_at 
    BEFORE UPDATE ON credits_redemption_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. Add comments for documentation
COMMENT ON TABLE credits_transactions IS 'Audit trail for all credits transactions (earn, spend, refund, admin adjustments)';
COMMENT ON TABLE credits_earning_rules IS 'Configurable rules for how users earn credits (percentage, fixed, tiered)';
COMMENT ON TABLE credits_redemption_rules IS 'Configurable rules for how users spend credits (limits, discounts, minimums)';
COMMENT ON TABLE credits_tiers IS 'Loyalty tiers with bonus multipliers and spending discounts';
COMMENT ON TABLE credits_referrals IS 'Referral tracking and bonus distribution';
COMMENT ON FUNCTION get_user_credits_tier IS 'Returns the current loyalty tier for a user based on total credits earned';
COMMENT ON FUNCTION add_user_credits IS 'Adds credits to a user account with audit trail and tier bonuses';
COMMENT ON FUNCTION spend_user_credits IS 'Spends user credits with tier discounts and validation';
COMMENT ON FUNCTION complete_referral IS 'Completes a referral and awards bonus credits to both users';
COMMENT ON VIEW user_credits_summary IS 'Comprehensive view of user credits status including tier, bonuses, and referral stats';


