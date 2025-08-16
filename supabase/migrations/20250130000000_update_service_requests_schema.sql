-- Update service_requests table to match API requirements
-- Migration: 20250130000000_update_service_requests_schema.sql

-- Add missing columns that the API expects
ALTER TABLE IF EXISTS service_requests 
ADD COLUMN IF NOT EXISTS service_details TEXT,
ADD COLUMN IF NOT EXISTS desired_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS customer_lng DECIMAL(11, 8);

-- Update existing rows to have default values
UPDATE service_requests 
SET 
  service_details = COALESCE(service_details, service_type),
  desired_datetime = COALESCE(desired_datetime, 
    (requested_date + requested_time)::TIMESTAMPTZ),
  customer_lat = COALESCE(customer_lat, 
    ST_Y(ST_AsText(location::geometry))),
  customer_lng = COALESCE(customer_lng, 
    ST_X(ST_AsText(location::geometry)))
WHERE service_details IS NULL 
   OR desired_datetime IS NULL 
   OR customer_lat IS NULL 
   OR customer_lng IS NULL;

-- Make new columns NOT NULL after setting defaults
ALTER TABLE IF EXISTS service_requests 
ALTER COLUMN service_details SET NOT NULL,
ALTER COLUMN desired_datetime SET NOT NULL,
ALTER COLUMN customer_lat SET NOT NULL,
ALTER COLUMN customer_lng SET NOT NULL;

-- Add index for service details search
CREATE INDEX IF NOT EXISTS idx_service_requests_service_details 
ON service_requests(service_details);

-- Add index for datetime search
CREATE INDEX IF NOT EXISTS idx_service_requests_datetime 
ON service_requests(desired_datetime);

-- Add index for customer location search
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_location 
ON service_requests(customer_lat, customer_lng);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Customers manage own requests" ON service_requests;
CREATE POLICY "Customers manage own requests" ON service_requests
    FOR ALL
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- Add policy for service details search (public read for matching)
DROP POLICY IF EXISTS "Public service details search" ON service_requests;
CREATE POLICY "Public service details search" ON service_requests
    FOR SELECT
    USING (status = 'pending');

-- Add policy for vendors to update status when responding
DROP POLICY IF EXISTS "Vendors can respond to requests" ON service_requests;
CREATE POLICY "Vendors can respond to requests" ON service_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM service_request_broadcasts b
            WHERE b.request_id = service_requests.id
              AND b.vendor_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT vendor_id FROM service_request_broadcasts 
            WHERE request_id = service_requests.id
        )
    );
