-- Enhance booking state machine
-- Add state transition validation and audit trail

-- Add state transition audit table
CREATE TABLE IF NOT EXISTS public.booking_state_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.users(id),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_booking_state_changes_booking_id ON public.booking_state_changes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_state_changes_created_at ON public.booking_state_changes(created_at);

-- Add refund tracking fields to bookings
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS refund_error TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS admin_override_reason TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS admin_override_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- Create function to validate state transitions
CREATE OR REPLACE FUNCTION validate_booking_state_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid transitions
    IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
    END IF;

    IF OLD.status = 'confirmed' AND NEW.status NOT IN ('completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid transition from confirmed to %', NEW.status;
    END IF;

    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        RAISE EXCEPTION 'Cannot transition from completed state';
    END IF;

    IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
        RAISE EXCEPTION 'Cannot transition from cancelled state';
    END IF;

    IF OLD.status = 'no_show' AND NEW.status != 'no_show' THEN
        RAISE EXCEPTION 'Cannot transition from no_show state';
    END IF;

    -- Record the state change
    INSERT INTO public.booking_state_changes (
        booking_id,
        from_status,
        to_status,
        changed_by,
        reason,
        metadata
    ) VALUES (
        NEW.id,
        OLD.status,
        NEW.status,
        COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
        CASE
            WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason
            WHEN NEW.status = 'completed' THEN 'Service completed'
            WHEN NEW.status = 'no_show' THEN 'Customer did not show up'
            ELSE NULL
        END,
        jsonb_build_object(
            'admin_override', NEW.admin_override,
            'admin_override_reason', NEW.admin_override_reason,
            'refund_status', NEW.refund_status
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for state transitions
DROP TRIGGER IF EXISTS booking_state_transition_trigger ON public.bookings;
CREATE TRIGGER booking_state_transition_trigger
    BEFORE UPDATE OF status ON public.bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION validate_booking_state_transition();

-- Create function to handle refund status updates
CREATE OR REPLACE FUNCTION handle_booking_refund_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-set refund status based on booking status changes
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Auto-refund on completion if commitment fee was paid
        IF NEW.commitment_fee_paid THEN
            NEW.refund_status = 'pending';
        END IF;
    ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
        -- Skip refund on no-show
        NEW.refund_status = 'skipped';
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Handle cancellation refund based on time before appointment
        -- Logic will be handled in application code
        IF NEW.commitment_fee_paid THEN
            NEW.refund_status = 'pending';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for refund status handling
DROP TRIGGER IF EXISTS booking_refund_status_trigger ON public.bookings;
CREATE TRIGGER booking_refund_status_trigger
    BEFORE UPDATE OF status ON public.bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_booking_refund_status();

-- Add RLS policies
ALTER TABLE public.booking_state_changes ENABLE ROW LEVEL SECURITY;

-- Allow read access to booking state changes for involved parties and admins
CREATE POLICY booking_state_changes_select ON public.booking_state_changes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_id
            AND (
                b.customer_id = auth.uid() OR
                b.vendor_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND u.role = 'admin'
                )
            )
        )
    );

-- Only allow system to insert state changes
CREATE POLICY booking_state_changes_insert ON public.booking_state_changes
    FOR INSERT
    WITH CHECK (true);  -- Controlled by trigger

-- Add function to check cancellation time
CREATE OR REPLACE FUNCTION is_cancellation_refundable(booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    booking_record public.bookings;
    hours_before NUMERIC;
BEGIN
    SELECT * INTO booking_record
    FROM public.bookings
    WHERE id = booking_id;

    IF booking_record IS NULL THEN
        RETURN false;
    END IF;

    -- Calculate hours between cancellation and scheduled start
    hours_before := EXTRACT(EPOCH FROM (booking_record.slot_start - booking_record.cancelled_at)) / 3600;

    -- Refundable if cancelled more than 24 hours before
    RETURN hours_before >= 24;
END;
$$ LANGUAGE plpgsql;
