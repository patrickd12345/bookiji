-- Migration: 20251222230000_fusion_ops_bus.sql

-- A.1 Create table ops_events
CREATE TABLE IF NOT EXISTS ops_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ts timestamptz NOT NULL DEFAULT now(),
    source text NOT NULL CHECK (source IN ('simcity', 'prod')),
    run_id uuid NULL,
    tenant_id uuid NULL,
    provider_id uuid NULL,
    type text NOT NULL,
    correlation_id text NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ops_events_source_ts ON ops_events (source, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ops_events_run_id_ts ON ops_events (run_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ops_events_provider_id_ts ON ops_events (provider_id, ts DESC);

-- Enable RLS
ALTER TABLE ops_events ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ops_events' AND policyname = 'service_role_all'
    ) THEN
        CREATE POLICY "service_role_all" ON ops_events FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ops_events' AND policyname = 'authenticated_read'
    ) THEN
        CREATE POLICY "authenticated_read" ON ops_events FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- A.2 Create view ops_events_fused
CREATE OR REPLACE VIEW ops_events_fused AS
SELECT * FROM ops_events;

-- A.3 Create function get_ops_metrics
CREATE OR REPLACE FUNCTION get_ops_metrics(
    p_source text,
    p_window_seconds int,
    p_provider_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_result json;
    v_start_ts timestamptz;
BEGIN
    v_start_ts := now() - (p_window_seconds * interval '1 second');

    IF p_source = 'fused' THEN
        WITH prod_stats AS (
            SELECT 
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_created'), 0) as created,
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_cancelled'), 0) as cancelled,
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_rescheduled'), 0) as rescheduled,
                COALESCE(COUNT(*) FILTER (WHERE type = 'slot_released'), 0) as released,
                COALESCE(COUNT(*) FILTER (WHERE type = 'slot_claimed'), 0) as claimed,
                COALESCE(COUNT(*) FILTER (WHERE type = 'invariant_failed'), 0) as failed
            FROM ops_events
            WHERE source = 'prod' AND ts >= v_start_ts AND (p_provider_id IS NULL OR provider_id = p_provider_id)
        ),
        simcity_stats AS (
            SELECT 
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_created'), 0) as created,
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_cancelled'), 0) as cancelled,
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_rescheduled'), 0) as rescheduled,
                COALESCE(COUNT(*) FILTER (WHERE type = 'slot_released'), 0) as released,
                COALESCE(COUNT(*) FILTER (WHERE type = 'slot_claimed'), 0) as claimed,
                COALESCE(COUNT(*) FILTER (WHERE type = 'invariant_failed'), 0) as failed
            FROM ops_events
            WHERE source = 'simcity' AND ts >= v_start_ts AND (p_provider_id IS NULL OR provider_id = p_provider_id)
        )
        SELECT json_build_object(
            'prod', json_build_object(
                'bookings_created_count', p.created,
                'cancellations_count', p.cancelled,
                'reschedules_count', p.rescheduled,
                'active_bookings_count', (p.created - p.cancelled),
                'slots_available_count', (p.released - p.claimed),
                'slots_unavailable_count', p.claimed,
                'invariant_failures_count', p.failed
            ),
            'simcity', json_build_object(
                'bookings_created_count', s.created,
                'cancellations_count', s.cancelled,
                'reschedules_count', s.rescheduled,
                'active_bookings_count', (s.created - s.cancelled),
                'slots_available_count', (s.released - s.claimed),
                'slots_unavailable_count', s.claimed,
                'invariant_failures_count', s.failed
            ),
            'fused', json_build_object(
                'bookings_created_count', p.created + s.created,
                'cancellations_count', p.cancelled + s.cancelled,
                'reschedules_count', p.rescheduled + s.rescheduled,
                'active_bookings_count', (p.created + s.created) - (p.cancelled + s.cancelled),
                'slots_available_count', (p.released + s.released) - (p.claimed + s.claimed),
                'slots_unavailable_count', p.claimed + s.claimed,
                'invariant_failures_count', p.failed + s.failed
            )
        ) INTO v_result
        FROM prod_stats p, simcity_stats s;
    ELSE
        -- Single source logic
        WITH stats AS (
            SELECT 
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_created'), 0) as created,
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_cancelled'), 0) as cancelled,
                COALESCE(COUNT(*) FILTER (WHERE type = 'booking_rescheduled'), 0) as rescheduled,
                COALESCE(COUNT(*) FILTER (WHERE type = 'slot_released'), 0) as released,
                COALESCE(COUNT(*) FILTER (WHERE type = 'slot_claimed'), 0) as claimed,
                COALESCE(COUNT(*) FILTER (WHERE type = 'invariant_failed'), 0) as failed
            FROM ops_events
            WHERE source = p_source AND ts >= v_start_ts AND (p_provider_id IS NULL OR provider_id = p_provider_id)
        )
        SELECT json_build_object(
            'bookings_created_count', s.created,
            'cancellations_count', s.cancelled,
            'reschedules_count', s.rescheduled,
            'active_bookings_count', (s.created - s.cancelled),
            'slots_available_count', (s.released - s.claimed),
            'slots_unavailable_count', s.claimed,
            'invariant_failures_count', s.failed
        ) INTO v_result
        FROM stats s;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ops_metrics(text, int, uuid) TO authenticated, anon, service_role;

-- B.2 Production Emitter Triggers

-- 1. booking_created
CREATE OR REPLACE FUNCTION trg_ops_booking_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ops_events (source, run_id, tenant_id, provider_id, type, payload)
    VALUES ('prod', NULL, NULL, NEW.provider_id, 'booking_created', jsonb_build_object('booking_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ops_booking_created_after_insert ON bookings;
CREATE TRIGGER trg_ops_booking_created_after_insert
AFTER INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION trg_ops_booking_created();

-- 2. booking_cancelled / booking_rescheduled
CREATE OR REPLACE FUNCTION trg_ops_booking_updated()
RETURNS TRIGGER AS $$
BEGIN
    -- booking_cancelled
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        INSERT INTO ops_events (source, run_id, tenant_id, provider_id, type, payload)
        VALUES ('prod', NULL, NULL, NEW.provider_id, 'booking_cancelled', jsonb_build_object('booking_id', NEW.id));
    END IF;

    -- booking_rescheduled
    IF (NEW.start_time != OLD.start_time OR NEW.end_time != OLD.end_time) THEN
        INSERT INTO ops_events (source, run_id, tenant_id, provider_id, type, payload)
        VALUES ('prod', NULL, NULL, NEW.provider_id, 'booking_rescheduled', jsonb_build_object('booking_id', NEW.id, 'old_start', OLD.start_time, 'new_start', NEW.start_time));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ops_booking_updated_after_update ON bookings;
CREATE TRIGGER trg_ops_booking_updated_after_update
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION trg_ops_booking_updated();

-- 3. slot_claimed / slot_released
CREATE OR REPLACE FUNCTION trg_ops_slot_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_available = false AND (OLD.is_available = true OR OLD.is_available IS NULL) THEN
        INSERT INTO ops_events (source, run_id, tenant_id, provider_id, type, payload)
        VALUES ('prod', NULL, NULL, NEW.provider_id, 'slot_claimed', jsonb_build_object('slot_id', NEW.id));
    ELSIF NEW.is_available = true AND (OLD.is_available = false OR OLD.is_available IS NULL) THEN
        INSERT INTO ops_events (source, run_id, tenant_id, provider_id, type, payload)
        VALUES ('prod', NULL, NULL, NEW.provider_id, 'slot_released', jsonb_build_object('slot_id', NEW.id));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ops_slot_updated_after_update ON availability_slots;
CREATE TRIGGER trg_ops_slot_updated_after_update
AFTER UPDATE ON availability_slots
FOR EACH ROW EXECUTE FUNCTION trg_ops_slot_updated();

