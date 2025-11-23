-- Disputes and No-Show System Migration
-- Creates comprehensive dispute management and automatic no-show detection

-- ========================================
-- 1. DISPUTES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('no_show', 'service_quality', 'payment_issue', 'scheduling_conflict', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'closed', 'rejected')),
  description TEXT NOT NULL,
  evidence TEXT[] DEFAULT '{}',
  requested_resolution TEXT NOT NULL CHECK (requested_resolution IN ('refund', 'reschedule', 'partial_refund', 'credit', 'other')),
  amount_requested DECIMAL(10,2),
  admin_notes TEXT,
  resolution TEXT,
  resolution_amount DECIMAL(10,2),
  resolution_type TEXT CHECK (resolution_type IN ('refund', 'reschedule', 'partial_refund', 'credit', 'rejected', 'other')),
  resolved_at TIMESTAMPTZ,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- 2. NO-SHOW TRACKING TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS no_show_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  auto_dispute_created BOOLEAN DEFAULT false,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  provider_compensated BOOLEAN DEFAULT false,
  compensation_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- 3. PROVIDER COMPENSATION TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS provider_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES disputes(id) ON DELETE SET NULL,
  no_show_event_id UUID REFERENCES no_show_events(id) ON DELETE SET NULL,
  compensation_type TEXT NOT NULL CHECK (compensation_type IN ('no_show', 'dispute_resolution', 'service_issue')),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payment_intent_id TEXT,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- 4. INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_user_id ON disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_dispute_type ON disputes(dispute_type);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_admin_id ON disputes(admin_id);

CREATE INDEX IF NOT EXISTS idx_no_show_events_booking_id ON no_show_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_no_show_events_customer_id ON no_show_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_no_show_events_provider_id ON no_show_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_no_show_events_scheduled_time ON no_show_events(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_no_show_events_detected_at ON no_show_events(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_compensations_booking_id ON provider_compensations(booking_id);
CREATE INDEX IF NOT EXISTS idx_provider_compensations_provider_id ON provider_compensations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_compensations_status ON provider_compensations(status);
CREATE INDEX IF NOT EXISTS idx_provider_compensations_dispute_id ON provider_compensations(dispute_id);

-- ========================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ========================================

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_compensations ENABLE ROW LEVEL SECURITY;

-- Disputes: Users can view their own disputes, admins can view all
CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can create own disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all disputes"
  ON disputes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- No-show events: Admins and involved parties can view
CREATE POLICY "Involved parties can view no-show events"
  ON no_show_events FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR auth.uid() = provider_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Provider compensations: Providers can view their own, admins can view all
CREATE POLICY "Providers can view own compensations"
  ON provider_compensations FOR SELECT
  USING (
    auth.uid() = provider_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- 6. FUNCTIONS FOR AUTOMATIC NO-SHOW DETECTION
-- ========================================

-- Function to detect and mark no-shows
CREATE OR REPLACE FUNCTION detect_no_shows()
RETURNS TABLE (
  booking_id UUID,
  customer_id UUID,
  provider_id UUID,
  scheduled_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.customer_id,
    b.provider_id,
    b.slot_start
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND b.slot_start < NOW() - INTERVAL '15 minutes' -- 15 min grace period
    AND b.slot_start > NOW() - INTERVAL '24 hours' -- Only check last 24 hours
    AND NOT EXISTS (
      SELECT 1 FROM no_show_events nse WHERE nse.booking_id = b.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create dispute for no-show
CREATE OR REPLACE FUNCTION auto_create_no_show_dispute(
  p_booking_id UUID,
  p_no_show_event_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_dispute_id UUID;
  v_booking RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Create dispute
  INSERT INTO disputes (
    booking_id,
    user_id,
    dispute_type,
    status,
    description,
    requested_resolution,
    amount_requested,
    created_at,
    updated_at
  ) VALUES (
    p_booking_id,
    v_booking.customer_id,
    'no_show',
    'pending',
    'Automatic dispute created for no-show. Customer did not attend scheduled appointment.',
    'refund',
    v_booking.total_amount_cents / 100.0,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_dispute_id;

  -- Update no-show event
  UPDATE no_show_events
  SET dispute_id = v_dispute_id,
      auto_dispute_created = true
  WHERE id = p_no_show_event_id;

  RETURN v_dispute_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. CREATE/ENSURE UPDATED_AT FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ========================================

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_compensations_updated_at
  BEFORE UPDATE ON provider_compensations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 9. HELPER FUNCTION FOR DISPUTE RESOLUTION
-- ========================================

CREATE OR REPLACE FUNCTION resolve_dispute(
  p_dispute_id UUID,
  p_admin_id UUID,
  p_resolution TEXT,
  p_resolution_amount DECIMAL(10,2),
  p_resolution_type TEXT,
  p_admin_notes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_dispute RECORD;
  v_booking RECORD;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found: %', p_dispute_id;
  END IF;

  IF v_dispute.status IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Dispute already resolved';
  END IF;

  -- Update dispute
  UPDATE disputes
  SET status = 'resolved',
      resolution = p_resolution,
      resolution_amount = p_resolution_amount,
      resolution_type = p_resolution_type,
      admin_notes = p_admin_notes,
      admin_id = p_admin_id,
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_dispute_id;

  -- If resolution includes refund, update booking
  IF p_resolution_type = 'refund' OR p_resolution_type = 'partial_refund' THEN
    UPDATE bookings
    SET refund_status = 'processing',
        refund_amount_cents = COALESCE(p_resolution_amount, 0) * 100,
        updated_at = NOW()
    WHERE id = v_dispute.booking_id;
  END IF;

  -- If no-show, compensate provider
  IF v_dispute.dispute_type = 'no_show' THEN
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = v_dispute.booking_id;

    -- Create provider compensation
    INSERT INTO provider_compensations (
      booking_id,
      provider_id,
      dispute_id,
      compensation_type,
      amount_cents,
      status,
      notes,
      created_at,
      updated_at
    ) VALUES (
      v_dispute.booking_id,
      v_booking.provider_id,
      p_dispute_id,
      'no_show',
      COALESCE(v_booking.total_amount_cents, 0),
      'pending',
      'Compensation for customer no-show',
      NOW(),
      NOW()
    );

    -- Update no-show event
    UPDATE no_show_events
    SET provider_compensated = true,
        compensation_amount = v_booking.total_amount_cents / 100.0
    WHERE booking_id = v_dispute.booking_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

