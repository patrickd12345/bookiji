-- Migration: Schema Cleanup and Enhancements
-- Description: Fixes schema issues and adds missing features

-- 1. Credits/Loyalty System
CREATE TABLE IF NOT EXISTS user_credits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    balance_cents integer NOT NULL DEFAULT 0,
    lifetime_earned_cents integer NOT NULL DEFAULT 0,
    tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    points integer NOT NULL DEFAULT 0,
    last_transaction_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_cents integer NOT NULL,
    points_earned integer DEFAULT 0,
    transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'refund', 'expire', 'points_conversion')),
    description text,
    booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
    reference_id uuid,
    reference_type text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for credits system
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_booking_id ON credit_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

-- 2. Vendor migration skipped - vendors table doesn't exist in this schema
-- The profiles table is already properly set up

-- 3. Enhance calendar integration (conditional - table may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'provider_google_calendar') THEN
        ALTER TABLE provider_google_calendar
            ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone,
            ADD COLUMN IF NOT EXISTS sync_status text CHECK (sync_status IN ('success', 'failed', 'in_progress')),
            ADD COLUMN IF NOT EXISTS sync_error text,
            ADD COLUMN IF NOT EXISTS calendar_ids text[],
            ADD COLUMN IF NOT EXISTS sync_frequency_minutes integer DEFAULT 5,
            ADD COLUMN IF NOT EXISTS last_error_at timestamp with time zone,
            ADD COLUMN IF NOT EXISTS error_count integer DEFAULT 0,
            ADD COLUMN IF NOT EXISTS sync_enabled boolean DEFAULT true;

        -- Create index for calendar sync monitoring
        CREATE INDEX IF NOT EXISTS idx_provider_google_calendar_sync_status 
            ON provider_google_calendar(sync_status, last_sync_at);
    END IF;
END $$;

-- 4. Standardize timestamp types
ALTER TABLE availability_slots
    ALTER COLUMN start_time TYPE timestamp with time zone USING start_time AT TIME ZONE 'UTC',
    ALTER COLUMN end_time TYPE timestamp with time zone USING end_time AT TIME ZONE 'UTC',
    ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';

ALTER TABLE services
    ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE provider_locations
    ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 5. Add RLS policies for new tables
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all credit data
CREATE POLICY "Service role can manage credits" ON user_credits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage transactions" ON credit_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Add functions for credits management
CREATE OR REPLACE FUNCTION process_credit_transaction(
    p_user_id uuid,
    p_amount_cents integer,
    p_transaction_type text,
    p_description text,
    p_booking_id uuid DEFAULT NULL,
    p_reference_id uuid DEFAULT NULL,
    p_reference_type text DEFAULT NULL,
    p_expires_at timestamp with time zone DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_transaction_id uuid;
    v_points_earned integer;
BEGIN
    -- Calculate points (1 point per dollar spent/earned)
    v_points_earned := CASE 
        WHEN p_transaction_type IN ('earn', 'refund') THEN abs(p_amount_cents / 100)
        ELSE 0
    END;

    -- Create transaction record
    INSERT INTO credit_transactions (
        user_id, amount_cents, points_earned, transaction_type, 
        description, booking_id, reference_id, reference_type, expires_at
    ) VALUES (
        p_user_id, p_amount_cents, v_points_earned, p_transaction_type,
        p_description, p_booking_id, p_reference_id, p_reference_type, p_expires_at
    ) RETURNING id INTO v_transaction_id;

    -- Update user credits
    UPDATE user_credits 
    SET 
        balance_cents = CASE 
            WHEN p_transaction_type IN ('earn', 'refund') THEN balance_cents + p_amount_cents
            WHEN p_transaction_type = 'spend' THEN balance_cents - abs(p_amount_cents)
            ELSE balance_cents
        END,
        lifetime_earned_cents = CASE 
            WHEN p_transaction_type = 'earn' THEN lifetime_earned_cents + p_amount_cents
            ELSE lifetime_earned_cents
        END,
        points = points + v_points_earned,
        last_transaction_at = NOW(),
        updated_at = NOW(),
        -- Update tier based on lifetime earnings
        tier = CASE 
            WHEN lifetime_earned_cents + CASE WHEN p_transaction_type = 'earn' THEN p_amount_cents ELSE 0 END >= 1000000 THEN 'platinum'
            WHEN lifetime_earned_cents + CASE WHEN p_transaction_type = 'earn' THEN p_amount_cents ELSE 0 END >= 500000 THEN 'gold'
            WHEN lifetime_earned_cents + CASE WHEN p_transaction_type = 'earn' THEN p_amount_cents ELSE 0 END >= 100000 THEN 'silver'
            ELSE 'bronze'
        END
    WHERE user_id = p_user_id;

    -- Create user_credits record if it doesn't exist
    INSERT INTO user_credits (user_id, balance_cents, lifetime_earned_cents, points)
    VALUES (p_user_id, 
        CASE 
            WHEN p_transaction_type IN ('earn', 'refund') THEN p_amount_cents
            ELSE 0
        END,
        CASE 
            WHEN p_transaction_type = 'earn' THEN p_amount_cents
            ELSE 0
        END,
        v_points_earned)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user credits balance
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id uuid)
RETURNS TABLE (
    balance_cents integer,
    points integer,
    tier text,
    lifetime_earned_cents integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.balance_cents,
        uc.points,
        uc.tier,
        uc.lifetime_earned_cents
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for new tables
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE user_credits IS 'Stores user credit balances and loyalty program status';
COMMENT ON TABLE credit_transactions IS 'Records all credit and point transactions';
COMMENT ON FUNCTION process_credit_transaction IS 'Handles credit transactions and updates user balances';
COMMENT ON FUNCTION get_user_credits IS 'Retrieves current credit balance and loyalty status for a user'; 