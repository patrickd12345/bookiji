-- Migration: Recurring Availability and Blocking (F-011, F-012)
-- Adds support for recurring availability rules, block time, and profile availability settings.

-- 1. Update profiles table with availability settings
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS availability_mode TEXT CHECK (availability_mode IN ('subtractive', 'additive')) DEFAULT 'subtractive';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- 2. Create recurring_availability_rules table
CREATE TABLE IF NOT EXISTS recurring_availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL, -- The time of day this rule starts (date part ignored for recurrence, used for initial instance)
    end_time TIMESTAMPTZ NOT NULL,   -- The time of day this rule ends
    recurrence_rule JSONB NOT NULL,  -- e.g., { "freq": "WEEKLY", "days": ["MON", "WED"] }
    slot_type TEXT CHECK (slot_type IN ('available', 'blocked')) DEFAULT 'available',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Link availability_slots to rules
ALTER TABLE availability_slots
ADD COLUMN IF NOT EXISTS recurring_rule_id UUID REFERENCES recurring_availability_rules(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_rules_provider ON recurring_availability_rules(provider_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_active ON recurring_availability_rules(is_active);

-- Trigger to update updated_at
CREATE TRIGGER update_recurring_rules_updated_at BEFORE UPDATE ON recurring_availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE recurring_availability_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can manage own recurring rules" ON recurring_availability_rules
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view recurring rules" ON recurring_availability_rules
    FOR SELECT USING (true);


-- 4. Function to materialize recurring slots
-- This function generates individual slots in availability_slots based on the rule
-- for a specified horizon (e.g., next 90 days).
CREATE OR REPLACE FUNCTION materialize_recurring_slots(
    p_rule_id UUID,
    p_horizon_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    v_rule RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_current_date DATE;
    v_slots_created INTEGER := 0;
    v_day_of_week INTEGER; -- 0=Sun, 6=Sat (Postgres extract dow)
    v_rule_days TEXT[]; -- Array of days from JSONB (e.g. ["MON", "TUE"])
    v_day_map JSONB := '{"SUN": 0, "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6}';
    v_rule_start_time TIME;
    v_rule_end_time TIME;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
BEGIN
    -- Get the rule
    SELECT * INTO v_rule FROM recurring_availability_rules WHERE id = p_rule_id;

    IF v_rule IS NULL OR v_rule.is_active = false THEN
        RETURN 0;
    END IF;

    -- Determine date range
    v_start_date := DATE(NOW());
    v_end_date := v_start_date + p_horizon_days;

    -- Extract time parts (assuming input TIMESTAMPTZ captures the correct wall time in provider's timezone)
    -- Ideally, we should handle timezone conversions explicitly, but for now we assume
    -- the rule's start_time/end_time carry the correct offset or are UTC normalized.
    -- A robust solution would store wall time + timezone string.
    -- Here we rely on the time part of the stored timestamp.
    v_rule_start_time := v_rule.start_time::TIME;
    v_rule_end_time := v_rule.end_time::TIME;

    -- Parse days from recurrence_rule (simple implementation for WEEKLY)
    -- Expected JSON: { "freq": "WEEKLY", "days": ["MON", "WED"] }
    IF v_rule.recurrence_rule->>'freq' = 'WEEKLY' THEN
        -- Convert JSON array to text array
        SELECT ARRAY(SELECT jsonb_array_elements_text(v_rule.recurrence_rule->'days')) INTO v_rule_days;

        -- Loop through days
        v_current_date := v_start_date;
        WHILE v_current_date <= v_end_date LOOP
            v_day_of_week := EXTRACT(DOW FROM v_current_date);

            -- Check if current day matches any day in the rule
            -- We map 0-6 to SUN-SAT
            DECLARE
                day_code TEXT;
                should_create BOOLEAN := false;
            BEGIN
                FOR i IN 1..array_length(v_rule_days, 1) LOOP
                    IF (v_day_map->>v_rule_days[i])::INTEGER = v_day_of_week THEN
                        should_create := true;
                        EXIT;
                    END IF;
                END LOOP;

                IF should_create THEN
                    -- Construct timestamp for this specific day
                    -- Note: This is a simplification. Real calendar math needs timezone handling.
                    -- We construct the timestamp by combining the current date date and the rule's time.
                    v_slot_start := (v_current_date || ' ' || v_rule_start_time)::TIMESTAMPTZ;
                    v_slot_end := (v_current_date || ' ' || v_rule_end_time)::TIMESTAMPTZ;

                    -- Handle overnight slots (end time < start time implies next day)
                    IF v_rule_end_time <= v_rule_start_time THEN
                        v_slot_end := v_slot_end + INTERVAL '1 day';
                    END IF;

                    -- Try insert (ignore conflicts for now, or let constraints handle them)
                    BEGIN
                        INSERT INTO availability_slots (
                            provider_id,
                            start_time,
                            end_time,
                            is_available,
                            slot_type,
                            recurring_rule_id
                        ) VALUES (
                            v_rule.provider_id,
                            v_slot_start,
                            v_slot_end,
                            (v_rule.slot_type = 'available'),
                            v_rule.slot_type,
                            v_rule.id
                        )
                        ON CONFLICT DO NOTHING; -- Handle unique constraint (exact match)

                        v_slots_created := v_slots_created + 1;
                    EXCEPTION
                        WHEN unique_violation THEN NULL; -- Skip duplicates (redundant but safe)
                        WHEN exclusion_violation THEN
                            -- Skip overlaps.
                            -- NOTE: This means if a small block exists (e.g., 9-10am), the entire recurring slot (e.g., 9-5pm) will fail to insert.
                            -- This is a known limitation. A more advanced implementation would split the slot around the block.
                            NULL;
                    END;
                END IF;
            END;

            v_current_date := v_current_date + 1;
        END LOOP;
    END IF;

    RETURN v_slots_created;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_availability_rules TO authenticated;
GRANT EXECUTE ON FUNCTION materialize_recurring_slots(UUID, INTEGER) TO authenticated;
