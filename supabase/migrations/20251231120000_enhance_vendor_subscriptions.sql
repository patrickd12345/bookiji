-- ======================================================================
-- Enhance Vendor Subscriptions for Full Lifecycle Management
-- Migration: 20251231120000_enhance_vendor_subscriptions.sql
-- Description: Adds plan types, trial periods, billing cycles, and feature tracking
-- Safe to re-run: uses IF NOT EXISTS and ALTER TABLE IF EXISTS checks
-- ======================================================================

BEGIN;

-- ========================================
-- 1. ENHANCE VENDOR_SUBSCRIPTIONS TABLE
-- ========================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Plan type (free, basic, pro, enterprise)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN plan_type TEXT CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')) DEFAULT 'free';
    END IF;

    -- Billing cycle (monthly, annual)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'billing_cycle'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly';
    END IF;

    -- Trial period management
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'trial_start'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN trial_start TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'trial_end'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN trial_end TIMESTAMPTZ;
    END IF;

    -- Cancel at period end flag
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'cancel_at_period_end'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;
    END IF;

    -- Current period start (if missing)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN current_period_start TIMESTAMPTZ;
    END IF;

    -- Plan ID for Stripe price reference
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_subscriptions' 
        AND column_name = 'plan_id'
    ) THEN
        ALTER TABLE vendor_subscriptions 
        ADD COLUMN plan_id TEXT;
    END IF;
END $$;

-- ========================================
-- 2. CREATE VENDOR_SUBSCRIPTION_FEATURES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS vendor_subscription_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES vendor_subscriptions(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    feature_value JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subscription_id, feature_name)
);

-- Indexes for vendor_subscription_features
CREATE INDEX IF NOT EXISTS idx_vendor_subscription_features_subscription_id 
ON vendor_subscription_features(subscription_id);

CREATE INDEX IF NOT EXISTS idx_vendor_subscription_features_feature_name 
ON vendor_subscription_features(feature_name);

-- ========================================
-- 3. CREATE SUBSCRIPTION PLAN DEFINITIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    price_cents INTEGER NOT NULL,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    trial_days INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, plan_type, billing_cycle, price_cents, trial_days, features, is_active)
VALUES
    ('free', 'Free', 'Basic booking system access', 'free', 'monthly', 0, 0, '{"booking_limit": 10, "calendar_sync": false, "analytics": false}', true),
    ('basic_monthly', 'Basic', 'Essential booking features', 'basic', 'monthly', 2900, 14, '{"booking_limit": 100, "calendar_sync": true, "analytics": true}', true),
    ('basic_annual', 'Basic', 'Essential booking features (Annual)', 'basic', 'annual', 29000, 14, '{"booking_limit": 100, "calendar_sync": true, "analytics": true}', true),
    ('pro_monthly', 'Pro', 'Advanced features for growing businesses', 'pro', 'monthly', 9900, 14, '{"booking_limit": -1, "calendar_sync": true, "analytics": true, "custom_branding": true}', true),
    ('pro_annual', 'Pro', 'Advanced features (Annual)', 'pro', 'annual', 99000, 14, '{"booking_limit": -1, "calendar_sync": true, "analytics": true, "custom_branding": true}', true),
    ('enterprise_monthly', 'Enterprise', 'Full-featured solution', 'enterprise', 'monthly', 29900, 14, '{"booking_limit": -1, "calendar_sync": true, "analytics": true, "custom_branding": true, "priority_support": true, "api_access": true}', true),
    ('enterprise_annual', 'Enterprise', 'Full-featured solution (Annual)', 'enterprise', 'annual', 299000, 14, '{"booking_limit": -1, "calendar_sync": true, "analytics": true, "custom_branding": true, "priority_support": true, "api_access": true}', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. ENABLE RLS ON NEW TABLES
-- ========================================

ALTER TABLE vendor_subscription_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. CREATE RLS POLICIES
-- ========================================

-- Vendor subscription features policies
CREATE POLICY IF NOT EXISTS "Vendors can view own subscription features"
ON vendor_subscription_features
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM vendor_subscriptions vs
        JOIN profiles p ON p.id = vs.provider_id
        WHERE vs.id = vendor_subscription_features.subscription_id
        AND p.auth_user_id = auth.uid()
    )
);

CREATE POLICY IF NOT EXISTS "Service role can manage subscription features"
ON vendor_subscription_features
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Subscription plans policies (public read)
CREATE POLICY IF NOT EXISTS "Anyone can view active subscription plans"
ON subscription_plans
FOR SELECT
USING (is_active = true);

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get vendor subscription with features
CREATE OR REPLACE FUNCTION get_vendor_subscription_with_features(p_vendor_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    vendor_id UUID,
    status TEXT,
    plan_type TEXT,
    billing_cycle TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.id,
        vs.provider_id,
        vs.subscription_status,
        vs.plan_type,
        vs.billing_cycle,
        vs.current_period_start,
        vs.current_period_end,
        vs.trial_start,
        vs.trial_end,
        vs.cancel_at_period_end,
        COALESCE(
            jsonb_object_agg(vsf.feature_name, vsf.feature_value) FILTER (WHERE vsf.feature_name IS NOT NULL),
            '{}'::jsonb
        ) as features
    FROM vendor_subscriptions vs
    LEFT JOIN vendor_subscription_features vsf ON vsf.subscription_id = vs.id
    WHERE vs.provider_id = p_vendor_id
    GROUP BY vs.id, vs.provider_id, vs.subscription_status, vs.plan_type, vs.billing_cycle,
             vs.current_period_start, vs.current_period_end, vs.trial_start, vs.trial_end, vs.cancel_at_period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if vendor has active subscription (including trial)
CREATE OR REPLACE FUNCTION vendor_has_active_subscription(p_vendor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription vendor_subscriptions%ROWTYPE;
    v_now TIMESTAMPTZ;
BEGIN
    v_now := NOW();
    
    SELECT * INTO v_subscription
    FROM vendor_subscriptions
    WHERE provider_id = p_vendor_id
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if in trial period
    IF v_subscription.trial_start IS NOT NULL AND v_subscription.trial_end IS NOT NULL THEN
        IF v_now >= v_subscription.trial_start AND v_now <= v_subscription.trial_end THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check if subscription is active
    IF v_subscription.subscription_status IN ('active', 'trialing') THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. CREATE INDEXES
-- ========================================

-- Additional indexes for vendor_subscriptions
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_plan_type 
ON vendor_subscriptions(plan_type);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_billing_cycle 
ON vendor_subscriptions(billing_cycle);

CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_trial_end 
ON vendor_subscriptions(trial_end) WHERE trial_end IS NOT NULL;

-- ========================================
-- 8. UPDATE TRIGGERS
-- ========================================

-- Ensure updated_at trigger exists for vendor_subscription_features
CREATE TRIGGER IF NOT EXISTS update_vendor_subscription_features_updated_at
    BEFORE UPDATE ON vendor_subscription_features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure updated_at trigger exists for subscription_plans
CREATE TRIGGER IF NOT EXISTS update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
