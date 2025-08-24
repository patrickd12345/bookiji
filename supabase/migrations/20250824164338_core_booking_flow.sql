-- Core Booking Flow Database Schema
-- This migration enhances the existing booking system with core flow features

-- Create booking_state enum
CREATE TYPE booking_state AS ENUM (
  'quoted',
  'hold_placed', 
  'provider_confirmed',
  'receipt_issued',
  'cancelled',
  'refunded'
);

-- Create quotes table for candidate persistence
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_hash TEXT NOT NULL, -- Deterministic hash of search intent
  candidates JSONB NOT NULL, -- Snapshot of provider candidates
  price_cents INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhance existing bookings table with core flow features
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS state booking_state DEFAULT 'quoted',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS price_cents INTEGER;

-- Update existing bookings to have default state
UPDATE bookings SET state = 'quoted' WHERE state IS NULL;

-- Create audit_log table for state transitions
CREATE TABLE IF NOT EXISTS booking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_state booking_state,
  to_state booking_state NOT NULL,
  action TEXT NOT NULL, -- 'state_change', 'payment_hold', 'provider_confirm', 'cancel', 'refund'
  actor_type TEXT NOT NULL, -- 'user', 'system', 'provider', 'webhook'
  actor_id TEXT, -- user_id, 'system', provider_id, etc.
  metadata JSONB, -- Additional context about the action
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_user_intent ON quotes(user_id, intent_hash);
CREATE INDEX IF NOT EXISTS idx_quotes_expires ON quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_state ON bookings(provider_id, state);
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_booking ON booking_audit_log(booking_id, created_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to log state transitions
CREATE OR REPLACE FUNCTION log_booking_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO booking_audit_log (
      booking_id, 
      from_state, 
      to_state, 
      action, 
      actor_type, 
      actor_id, 
      metadata
    ) VALUES (
      NEW.id,
      OLD.state,
      NEW.state,
      'state_change',
      COALESCE(NEW.updated_by_type, 'system'),
      COALESCE(NEW.updated_by_id, 'system'),
      jsonb_build_object(
        'reason', COALESCE(NEW.cancelled_reason, ''),
        'payment_intent', NEW.stripe_payment_intent_id,
        'timestamp', NEW.updated_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for state change logging
DROP TRIGGER IF EXISTS log_booking_state_changes ON bookings;
CREATE TRIGGER log_booking_state_changes AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_booking_state_change();

-- Create function to check for expired quotes
CREATE OR REPLACE FUNCTION cleanup_expired_quotes()
RETURNS void AS $$
BEGIN
  DELETE FROM quotes WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create function to get booking summary
CREATE OR REPLACE FUNCTION get_booking_summary(booking_uuid UUID)
RETURNS TABLE (
  booking_id UUID,
  state booking_state,
  price_cents INTEGER,
  user_email TEXT,
  provider_name TEXT,
  created_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  audit_entries JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.state,
    b.price_cents,
    u.email,
    p.full_name,
    b.created_at,
    b.confirmed_at,
    b.cancelled_at,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'timestamp', al.created_at,
          'action', al.action,
          'from_state', al.from_state,
          'to_state', al.to_state,
          'actor', al.actor_type
        ) ORDER BY al.created_at
      ) FROM booking_audit_log al WHERE al.booking_id = b.id),
      '[]'::jsonb
    ) as audit_entries
  FROM bookings b
  JOIN auth.users u ON b.customer_id = u.id
  JOIN profiles p ON b.provider_id = p.id
  WHERE b.id = booking_uuid;
END;
$$ language 'plpgsql';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;
GRANT SELECT ON booking_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_summary(UUID) TO authenticated;

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Users can view their own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit log
CREATE POLICY "Users can view audit log for their bookings" ON booking_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b 
      WHERE b.id = booking_audit_log.booking_id 
      AND b.customer_id = auth.uid()
    )
  );

-- Insert initial SLO configuration for booking endpoints
INSERT INTO slo_config (metric_name, target_p95_ms, target_p99_ms, target_error_rate, target_cache_hit_rate, warning_threshold_multiplier, critical_threshold_multiplier)
VALUES 
  ('booking_quote_endpoint', 500, 1000, 0.01, 0.95, 1.5, 2.0),
  ('booking_confirm_endpoint', 500, 1000, 0.01, 0.95, 1.5, 2.0)
ON CONFLICT (metric_name) DO UPDATE SET
  target_p95_ms = EXCLUDED.target_p95_ms,
  target_p99_ms = EXCLUDED.target_p99_ms,
  target_error_rate = EXCLUDED.target_error_rate;
