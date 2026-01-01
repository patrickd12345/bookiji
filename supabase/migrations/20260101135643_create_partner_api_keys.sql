-- Create partners table for API partners
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create partner_api_keys table for API authentication
CREATE TABLE IF NOT EXISTS partner_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    api_key TEXT UNIQUE NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast API key lookups
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_api_key ON partner_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_partner_id ON partner_api_keys(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_active ON partner_api_keys(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partners (service role can manage, anon can read active)
CREATE POLICY "Service role can manage partners"
    ON partners FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can view active partners"
    ON partners FOR SELECT
    USING (is_active = true);

-- RLS Policies for partner_api_keys (service role only)
CREATE POLICY "Service role can manage partner API keys"
    ON partner_api_keys FOR ALL
    USING (auth.role() = 'service_role');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER handle_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_partner_api_keys_updated_at
    BEFORE UPDATE ON partner_api_keys
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();
