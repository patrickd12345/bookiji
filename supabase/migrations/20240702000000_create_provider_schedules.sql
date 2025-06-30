-- Description: Create a table to store provider's general weekly availability.

CREATE TABLE provider_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Day of the week, where 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Start and end times for the working day
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure a provider can only have one schedule per day/time combination
    -- This allows for split shifts, e.g., 9-12 and 1-5 on the same day.
    CONSTRAINT uq_profile_day_time UNIQUE (profile_id, day_of_week, start_time, end_time)
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER set_timestamp_provider_schedules
BEFORE UPDATE ON provider_schedules
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp(); 