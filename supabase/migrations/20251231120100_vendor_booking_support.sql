-- ======================================================================
-- Vendor Booking Support - Payment-Free Vendor Booking Flows
-- Migration: 20251231120100_vendor_booking_support.sql
-- Description: Adds support for vendor-created bookings without payment
-- Safe to re-run: uses IF NOT EXISTS checks
-- ======================================================================

BEGIN;

-- ========================================
-- 1. ADD VENDOR_CREATED FIELD TO BOOKINGS
-- ========================================

-- Add vendor_created flag to bookings table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'vendor_created'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN vendor_created BOOLEAN DEFAULT false;
    END IF;

    -- Add index for vendor-created bookings
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_bookings_vendor_created'
    ) THEN
        CREATE INDEX idx_bookings_vendor_created 
        ON bookings(vendor_created) WHERE vendor_created = true;
    END IF;
END $$;

-- ========================================
-- 2. ADD VENDOR_CREATED_BY FIELD
-- ========================================

-- Track which vendor created the booking
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'vendor_created_by'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN vendor_created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- 3. UPDATE BOOKING STATUS ENUM (if needed)
-- ========================================

-- Ensure we have a 'pending_customer_confirmation' status for vendor-created bookings
-- This is already covered by existing status values, but we'll add a comment
COMMENT ON COLUMN bookings.status IS 'Booking status: pending (awaiting confirmation), confirmed, completed, cancelled, no_show. For vendor-created bookings, starts as pending and requires customer confirmation.';

-- ========================================
-- 4. CREATE HELPER FUNCTION
-- ========================================

-- Function to check if booking is vendor-created and payment-free
CREATE OR REPLACE FUNCTION is_vendor_created_booking(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_vendor_created BOOLEAN;
BEGIN
    SELECT vendor_created INTO v_vendor_created
    FROM bookings
    WHERE id = p_booking_id;
    
    RETURN COALESCE(v_vendor_created, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
