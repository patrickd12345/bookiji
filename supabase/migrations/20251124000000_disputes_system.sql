-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    dispute_type TEXT NOT NULL CHECK (dispute_type IN ('no_show', 'service_quality', 'payment_issue', 'scheduling_conflict', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'closed')),
    description TEXT NOT NULL,
    evidence TEXT[] DEFAULT '{}',
    requested_resolution TEXT NOT NULL CHECK (requested_resolution IN ('full_refund', 'partial_refund', 'reschedule', 'other')),
    amount_requested INTEGER, -- in cents
    admin_notes TEXT,
    resolution TEXT,
    resolution_amount INTEGER, -- in cents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    admin_id UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX idx_disputes_user_id ON disputes(user_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- Enable RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own disputes"
    ON disputes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own disputes"
    ON disputes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all disputes"
    ON disputes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update disputes"
    ON disputes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
