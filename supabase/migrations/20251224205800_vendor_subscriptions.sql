-- Create vendor_subscriptions table
CREATE TABLE vendor_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused')),
    plan_id TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id),
    UNIQUE(stripe_customer_id),
    UNIQUE(stripe_subscription_id)
);

-- Enable RLS
ALTER TABLE vendor_subscriptions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_vendor_subscriptions_provider_id ON vendor_subscriptions(provider_id);
CREATE INDEX idx_vendor_subscriptions_stripe_customer_id ON vendor_subscriptions(stripe_customer_id);
CREATE INDEX idx_vendor_subscriptions_status ON vendor_subscriptions(subscription_status);

-- Policies
CREATE POLICY "Vendors can view own subscription" ON vendor_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = vendor_subscriptions.provider_id
            AND profiles.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage subscriptions" ON vendor_subscriptions
    FOR ALL USING (true); -- Service role (webhooks) needs full access

-- Grant permissions
GRANT SELECT ON vendor_subscriptions TO authenticated;
GRANT ALL ON vendor_subscriptions TO service_role;

-- Trigger for updated_at
-- Assuming update_updated_at_column() already exists from base schema
CREATE TRIGGER update_vendor_subscriptions_updated_at
    BEFORE UPDATE ON vendor_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


