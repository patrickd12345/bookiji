CREATE TABLE IF NOT EXISTS provider_google_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    google_email TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_profile_id UNIQUE (profile_id)
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if present to avoid duplicate error
DROP TRIGGER IF EXISTS set_timestamp ON provider_google_calendar;

-- Ensure required columns exist when table already present
ALTER TABLE provider_google_calendar ADD COLUMN IF NOT EXISTS google_email TEXT;
ALTER TABLE provider_google_calendar ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE provider_google_calendar ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE provider_google_calendar ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE provider_google_calendar ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE provider_google_calendar ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON provider_google_calendar
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

COMMENT ON TABLE "public"."provider_google_calendar" IS 'Stores Google Calendar API tokens for providers.';
COMMENT ON COLUMN "public"."provider_google_calendar"."profile_id" IS 'Links to the provider''s profile.';
COMMENT ON COLUMN "public"."provider_google_calendar"."google_email" IS 'The email address of the connected Google Calendar account.';
COMMENT ON COLUMN "public"."provider_google_calendar"."access_token" IS 'Encrypted Google API access token.';
COMMENT ON COLUMN "public"."provider_google_calendar"."refresh_token" IS 'Encrypted Google API refresh token, used to get new access tokens.';
COMMENT ON COLUMN "public"."provider_google_calendar"."expiry_date" IS 'The exact date and time when the access token expires.';
COMMENT ON CONSTRAINT "uq_profile_id" ON "public"."provider_google_calendar" IS 'Ensures that each provider can only have one Google Calendar integration.'; 