-- Manual Reschedule System Setup - ROBUST VERSION
-- Copy and paste this into your Supabase SQL Editor
-- This script handles all conflicts and existing objects safely

-- ========================================
-- 1. CLEAN UP EXISTING FUNCTIONS (IF ANY)
-- ========================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.reschedule_complete_tx(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.reschedule_complete_tx(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.reschedule_complete_tx(UUID, UUID, TEXT, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS public.cleanup_expired_reschedule_holds();

-- ========================================
-- 2. RESCHEDULE TOKENS TABLE (CREATE OR MODIFY)
-- ========================================

-- First, check if table exists and add missing columns
DO $$ 
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reschedule_tokens') THEN
        CREATE TABLE public.reschedule_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            jti TEXT NOT NULL UNIQUE,
            booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if table exists
        ALTER TABLE public.reschedule_tokens 
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        
        -- Update existing rows to have a default expires_at if it's NULL
        UPDATE public.reschedule_tokens 
        SET expires_at = created_at + INTERVAL '15 minutes'
        WHERE expires_at IS NULL;
        
        -- Make expires_at NOT NULL after updating existing rows
        ALTER TABLE public.reschedule_tokens 
        ALTER COLUMN expires_at SET NOT NULL;
    END IF;
END $$;

-- Add indices for performance (will skip if they already exist)
CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_jti ON public.reschedule_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_booking_id ON public.reschedule_tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_expires_at ON public.reschedule_tokens(expires_at);

-- ========================================
-- 3. ADD MISSING BOOKING FIELDS
-- ========================================

-- Add reschedule-specific fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS reschedule_in_progress BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reschedule_hold_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reschedule_of_booking_id UUID REFERENCES public.bookings(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS replaced_by_booking_id UUID REFERENCES public.bookings(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS audit_json JSONB DEFAULT '{}';

-- Add indices for reschedule fields
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_in_progress ON public.bookings(reschedule_in_progress);
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_hold_expires ON public.bookings(reschedule_hold_expires_at);
CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_of ON public.bookings(reschedule_of_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_replaced_by ON public.bookings(replaced_by_booking_id);

-- ========================================
-- 4. RPC FUNCTION FOR RESCHEDULE COMPLETION
-- ========================================

CREATE OR REPLACE FUNCTION public.reschedule_complete_tx(
  p_booking UUID,
  p_customer UUID,
  p_jti TEXT,
  p_new_start TIMESTAMP WITH TIME ZONE,
  p_new_end TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
  v_old_booking_id UUID;
  v_new_booking_id UUID;
  v_vendor_id UUID;
  v_service_id UUID;
  v_total_amount_cents INTEGER;
  v_commitment_fee_paid BOOLEAN;
  v_vendor_fee_paid BOOLEAN;
  v_payment_intent_id TEXT;
  v_payment_status TEXT;
  v_notes TEXT;
  v_audit_json JSONB;
BEGIN
  -- Start transaction
  BEGIN
    -- 1. Validate and burn the token
    UPDATE public.reschedule_tokens 
    SET used_at = NOW() 
    WHERE jti = p_jti 
      AND expires_at > NOW() 
      AND used_at IS NULL;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or expired token';
    END IF;
    
    -- 2. Get the old booking details
    SELECT 
      id, vendor_id, service_id, total_amount_cents, 
      commitment_fee_paid, vendor_fee_paid, payment_intent_id, 
      payment_status, notes, audit_json
    INTO v_old_booking_id, v_vendor_id, v_service_id, v_total_amount_cents,
         v_commitment_fee_paid, v_vendor_fee_paid, v_payment_intent_id,
         v_payment_status, v_notes, v_audit_json
    FROM public.bookings 
    WHERE id = p_booking 
      AND customer_id = p_customer 
      AND reschedule_in_progress = true;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid booking or not in reschedule state';
    END IF;
    
    -- 3. Create new booking
    INSERT INTO public.bookings (
      customer_id, vendor_id, service_id, slot_start, slot_end,
      total_amount_cents, commitment_fee_paid, vendor_fee_paid,
      payment_intent_id, payment_status, notes, status,
      reschedule_of_booking_id, audit_json
    ) VALUES (
      p_customer, v_vendor_id, v_service_id, p_new_start, p_new_end,
      v_total_amount_cents, v_commitment_fee_paid, v_vendor_fee_paid,
      v_payment_intent_id, v_payment_status, v_notes, 'confirmed',
      v_old_booking_id, 
      jsonb_build_object(
        'event', 'reschedule_complete',
        'by', 'customer',
        'at', NOW(),
        'from_booking', v_old_booking_id,
        'new_start', p_new_start,
        'new_end', p_new_end
      )
    ) RETURNING id INTO v_new_booking_id;
    
    -- 4. Update old booking to cancelled and link to new
    UPDATE public.bookings 
    SET 
      status = 'cancelled',
      reschedule_in_progress = false,
      reschedule_hold_expires_at = NULL,
      replaced_by_booking_id = v_new_booking_id,
      cancelled_by = 'customer',
      cancelled_at = NOW(),
      cancellation_reason = 'Rescheduled',
      audit_json = jsonb_build_object(
        'event', 'reschedule_complete',
        'by', 'customer',
        'at', NOW(),
        'replaced_by', v_new_booking_id,
        'new_start', p_new_start,
        'new_end', p_new_end
      )
    WHERE id = v_old_booking_id;
    
    -- 5. Update reschedule count
    UPDATE public.bookings 
    SET 
      reschedule_count = COALESCE(reschedule_count, 0) + 1,
      last_rescheduled_at = NOW()
    WHERE id = v_new_booking_id;
    
    -- Return the new booking ID
    RETURN v_new_booking_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      RAISE EXCEPTION 'Reschedule failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reschedule_complete_tx(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- ========================================
-- 5. CLEANUP FUNCTION FOR EXPIRED HOLDS
-- ========================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_reschedule_holds() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Restore expired reschedule holds to confirmed status
  UPDATE public.bookings 
  SET 
    status = 'confirmed',
    reschedule_in_progress = false,
    reschedule_hold_expires_at = NULL,
    audit_json = jsonb_build_object(
      'event', 'reschedule_hold_expired',
      'at', NOW(),
      'restored_to', 'confirmed'
    )
  WHERE reschedule_in_progress = true 
    AND reschedule_hold_expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Clean up expired tokens
  DELETE FROM public.reschedule_tokens 
  WHERE expires_at < NOW();
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reschedule_holds() TO authenticated;

-- ========================================
-- 6. COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.reschedule_tokens IS 'Single-use tokens for secure reschedule operations';
COMMENT ON COLUMN public.reschedule_tokens.jti IS 'JWT ID for single-use validation';
COMMENT ON COLUMN public.reschedule_tokens.used_at IS 'Timestamp when token was consumed';

COMMENT ON COLUMN public.bookings.reschedule_in_progress IS 'Whether this booking is currently being rescheduled';
COMMENT ON COLUMN public.bookings.reschedule_hold_expires_at IS 'When the reschedule hold expires';
COMMENT ON COLUMN public.bookings.reschedule_of_booking_id IS 'Original booking that was rescheduled';
COMMENT ON COLUMN public.bookings.replaced_by_booking_id IS 'New booking that replaced this one';
COMMENT ON COLUMN public.bookings.audit_json IS 'Audit trail for booking changes';

COMMENT ON FUNCTION public.reschedule_complete_tx(UUID, UUID, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 'Atomic transaction to complete a reschedule operation';
COMMENT ON FUNCTION public.cleanup_expired_reschedule_holds() IS 'Cleanup function for expired reschedule holds';

-- ========================================
-- 7. VERIFICATION QUERIES
-- ========================================

-- Check if tables were created/modified
SELECT 'reschedule_tokens' as table_name, COUNT(*) as row_count FROM public.reschedule_tokens
UNION ALL
SELECT 'bookings with reschedule fields' as table_name, COUNT(*) as row_count FROM public.bookings WHERE reschedule_in_progress IS NOT NULL;

-- Check if functions were created
SELECT routine_name, routine_type FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('reschedule_complete_tx', 'cleanup_expired_reschedule_holds');

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reschedule_tokens' 
ORDER BY ordinal_position;

-- Test function call (this will show the function signature)
SELECT pg_get_function_identity_arguments(oid) as function_signature
FROM pg_proc 
WHERE proname = 'reschedule_complete_tx' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
