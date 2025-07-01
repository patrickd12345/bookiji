-- Create an enum for calendar system types
CREATE TYPE calendar_system_type AS ENUM ('google', 'outlook', 'ical', 'exchange', 'custom');

-- Create a table for external calendar systems
CREATE TABLE external_calendar_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type calendar_system_type NOT NULL,
    api_endpoint TEXT,
    api_version TEXT,
    auth_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_name_type UNIQUE (name, type)
);

-- Add system_type to provider_google_calendar and rename it to provider_calendars
ALTER TABLE provider_google_calendar RENAME TO provider_calendars;
ALTER TABLE provider_calendars 
    ADD COLUMN system_type calendar_system_type NOT NULL DEFAULT 'google',
    ADD COLUMN system_id UUID REFERENCES external_calendar_systems(id),
    ADD COLUMN system_specific_data JSONB;

-- Update the trigger for the renamed table
DROP TRIGGER IF EXISTS set_timestamp ON provider_google_calendar;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON provider_calendars
    FOR EACH ROW
    EXECUTE PROCEDURE trigger_set_timestamp();

-- Add indexes for better query performance
CREATE INDEX idx_provider_calendars_system_type ON provider_calendars(system_type);
CREATE INDEX idx_provider_calendars_system_id ON provider_calendars(system_id);

-- Add comments
COMMENT ON TABLE external_calendar_systems IS 'Defines different external calendar systems that can be integrated';
COMMENT ON COLUMN external_calendar_systems.type IS 'The type of calendar system (google, outlook, etc.)';
COMMENT ON COLUMN external_calendar_systems.api_endpoint IS 'Base API endpoint for the calendar system';
COMMENT ON COLUMN external_calendar_systems.api_version IS 'API version being used';
COMMENT ON COLUMN external_calendar_systems.auth_type IS 'Authentication type (oauth2, api_key, etc.)';

COMMENT ON TABLE provider_calendars IS 'Stores calendar integration details for providers across different systems';
COMMENT ON COLUMN provider_calendars.system_type IS 'The type of calendar system being used';
COMMENT ON COLUMN provider_calendars.system_id IS 'Reference to the external calendar system configuration';
COMMENT ON COLUMN provider_calendars.system_specific_data IS 'Additional data specific to the calendar system type';

-- Insert default calendar systems
INSERT INTO external_calendar_systems (name, type, api_endpoint, api_version, auth_type) VALUES
    ('Google Calendar', 'google', 'https://www.googleapis.com/calendar/v3', 'v3', 'oauth2'),
    ('Microsoft Outlook', 'outlook', 'https://graph.microsoft.com/v1.0/me/calendar', 'v1.0', 'oauth2'),
    ('iCalendar', 'ical', NULL, NULL, 'none');

-- Create a view for easier querying of calendar connections
CREATE VIEW v_provider_calendar_connections AS
SELECT 
    pc.*,
    ecs.name as system_name,
    ecs.api_endpoint,
    ecs.api_version,
    ecs.auth_type
FROM provider_calendars pc
LEFT JOIN external_calendar_systems ecs ON pc.system_id = ecs.id;

-- Create enum for calendar providers
CREATE TYPE calendar_provider AS ENUM ('google', 'microsoft', 'apple', 'custom');

-- Create table for external calendar connections
CREATE TABLE external_calendar_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider calendar_provider NOT NULL,
    provider_user_id TEXT,
    provider_calendar_id TEXT NOT NULL,
    provider_email TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    last_synced TIMESTAMP WITH TIME ZONE,
    sync_from_date TIMESTAMP WITH TIME ZONE,
    sync_frequency_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_calendar_id)
);

-- Create table for external events
CREATE TABLE external_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT NOT NULL,
    connection_id UUID REFERENCES external_calendar_connections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees TEXT[],
    location TEXT,
    status TEXT NOT NULL,
    last_modified TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(connection_id, external_id)
);

-- Add updated_at trigger
CREATE TRIGGER set_timestamp_external_calendar_connections
    BEFORE UPDATE ON external_calendar_connections
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_external_events
    BEFORE UPDATE ON external_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Add RLS policies
ALTER TABLE external_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar connections"
    ON external_calendar_connections FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar connections"
    ON external_calendar_connections FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections"
    ON external_calendar_connections FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections"
    ON external_calendar_connections FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own external events"
    ON external_events FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM external_calendar_connections
            WHERE id = external_events.connection_id
            AND user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX idx_external_calendar_connections_user_id ON external_calendar_connections(user_id);
CREATE INDEX idx_external_events_connection_id ON external_events(connection_id);
CREATE INDEX idx_external_events_start_time ON external_events(start_time);
CREATE INDEX idx_external_events_external_id ON external_events(external_id); 