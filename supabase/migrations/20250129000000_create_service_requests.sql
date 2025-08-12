-- Create service_requests table
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    requested_date DATE NOT NULL,
    requested_time TIME WITHOUT TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table linking requests to vendors they are broadcast to
CREATE TABLE IF NOT EXISTS service_request_broadcasts (
    request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, vendor_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_requests_location ON service_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_request_broadcasts_vendor ON service_request_broadcasts(vendor_id);

-- Trigger to keep updated_at current
CREATE TRIGGER set_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own requests
DROP POLICY IF EXISTS "Customers manage own requests" ON service_requests;
CREATE POLICY "Customers manage own requests" ON service_requests
    FOR ALL
    USING (auth.uid() = customer_id)
    WITH CHECK (auth.uid() = customer_id);

-- Vendors can view requests broadcast to them
DROP POLICY IF EXISTS "Vendors view broadcast requests" ON service_requests;
CREATE POLICY "Vendors view broadcast requests" ON service_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM service_request_broadcasts b
            WHERE b.request_id = service_requests.id
              AND b.vendor_id = auth.uid()
        )
    );

