-- Create partners table for partner API management
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create partner_api_keys table for API key authentication
CREATE TABLE IF NOT EXISTS partner_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL UNIQUE,
    name TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_api_key ON partner_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_partner_id ON partner_api_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_is_active ON partner_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON partners(is_active);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role can access everything, anon cannot
-- In production, you may want more granular policies
CREATE POLICY "Service role can manage partners"
    ON partners FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage partner_api_keys"
    ON partner_api_keys FOR ALL
    USING (auth.role() = 'service_role');
