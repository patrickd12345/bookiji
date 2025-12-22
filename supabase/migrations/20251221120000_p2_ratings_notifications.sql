-- P2 Ratings + Notification Intents

-- ========================================
-- 1. RATINGS TABLE (mutual, append-only)
-- ========================================

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ratee_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rater_role TEXT NOT NULL CHECK (rater_role IN ('customer', 'provider')),
  ratee_role TEXT NOT NULL CHECK (ratee_role IN ('customer', 'provider')),
  stars DECIMAL(2,1) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_stars_half_step CHECK (stars >= 1.0 AND stars <= 5.0 AND (stars * 2)::INTEGER = (stars * 2)),
  CONSTRAINT ratings_comment_length CHECK (comment IS NULL OR char_length(comment) <= 500)
);

CREATE UNIQUE INDEX IF NOT EXISTS ratings_booking_rater_role_unique
  ON ratings(booking_id, rater_role);

CREATE INDEX IF NOT EXISTS ratings_ratee_user_idx
  ON ratings(ratee_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ratings_rater_user_idx
  ON ratings(rater_user_id, created_at DESC);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raters can create ratings"
  ON ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = rater_user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can view ratings"
  ON ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
        AND (p.id = rater_user_id OR p.id = ratee_user_id OR p.role = 'admin')
    )
  );

-- Aggregates view (read-only, derived)
CREATE OR REPLACE VIEW rating_aggregates AS
SELECT
  ratee_user_id AS user_id,
  ratee_role AS role,
  COUNT(*) AS rating_count,
  ROUND(AVG(stars)::numeric, 1) AS avg_rating,
  MAX(created_at) AS last_updated
FROM ratings
GROUP BY ratee_user_id, ratee_role;

-- ========================================
-- 2. NOTIFICATION INTENTS + DELIVERIES
-- ========================================

CREATE TABLE IF NOT EXISTS notification_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  intent_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'normal', 'low')),
  allowed_channels TEXT[] NOT NULL,
  payload_ref JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL REFERENCES notification_intents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_unique
  ON notification_deliveries(intent_id, channel);

CREATE INDEX IF NOT EXISTS notification_intents_user_idx
  ON notification_intents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_deliveries_intent_idx
  ON notification_deliveries(intent_id, created_at DESC);

ALTER TABLE notification_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification intents"
  ON notification_intents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification deliveries"
  ON notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notification_intents ni
      WHERE ni.id = notification_deliveries.intent_id
        AND ni.user_id = auth.uid()
    )
  );

-- ========================================
-- 3. BATCH QUEUE EXTENSIONS (link to intents)
-- ========================================

ALTER TABLE notification_batch_queue
  ADD COLUMN IF NOT EXISTS intent_id UUID REFERENCES notification_intents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES notification_deliveries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notification_batch_queue_intent_idx
  ON notification_batch_queue(intent_id);

CREATE INDEX IF NOT EXISTS notification_batch_queue_delivery_idx
  ON notification_batch_queue(delivery_id);
