-- Add Muck Vendor Plan
INSERT INTO subscription_plans (id, name, description, plan_type, billing_cycle, price_cents, trial_days, features, is_active)
VALUES
    ('muck_vendor_monthly', 'Muck Vendor Plan', 'Special plan for Muck Vendors', 'pro', 'monthly', 4900, 14, '{"booking_limit": -1, "calendar_sync": true, "analytics": true, "custom_branding": true, "muck_vendor_access": true}', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    plan_type = EXCLUDED.plan_type,
    billing_cycle = EXCLUDED.billing_cycle,
    price_cents = EXCLUDED.price_cents,
    trial_days = EXCLUDED.trial_days,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;
