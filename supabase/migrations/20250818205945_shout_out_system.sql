-- Shout-Out System: Request broadcasting for vendors when no search results
-- When a user search returns 0 results, they can opt-in to broadcast their request
-- to eligible vendors who can then respond with offers

-- Enable PostGIS for geographical queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Main shout-out table
CREATE TABLE IF NOT EXISTS public.shout_outs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_km INTEGER NOT NULL DEFAULT 10,
    status TEXT CHECK (status IN ('active', 'expired', 'closed')) DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track which vendors were notified about each shout-out
CREATE TABLE IF NOT EXISTS public.shout_out_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shout_out_id UUID REFERENCES public.shout_outs(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    notified_at TIMESTAMPTZ DEFAULT NOW(),
    response_status TEXT CHECK (response_status IN ('pending', 'viewed', 'offered', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per shout_out + vendor combination
    UNIQUE(shout_out_id, vendor_id)
);

-- Vendor offers in response to shout-outs
CREATE TABLE IF NOT EXISTS public.shout_out_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shout_out_id UUID REFERENCES public.shout_outs(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    price_cents INTEGER NOT NULL,
    message TEXT, -- Optional vendor message
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one active offer per vendor per shout-out
    UNIQUE(shout_out_id, vendor_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_shout_outs_location ON public.shout_outs USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_shout_outs_status ON public.shout_outs(status);
CREATE INDEX IF NOT EXISTS idx_shout_outs_service_type ON public.shout_outs(service_type);
CREATE INDEX IF NOT EXISTS idx_shout_outs_expires_at ON public.shout_outs(expires_at);
CREATE INDEX IF NOT EXISTS idx_shout_out_recipients_vendor ON public.shout_out_recipients(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_recipients_shout_out ON public.shout_out_recipients(shout_out_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_offers_vendor ON public.shout_out_offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_offers_shout_out ON public.shout_out_offers(shout_out_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_offers_status ON public.shout_out_offers(status);

-- Add vendor preference for receiving shout-outs
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS shout_out_opt_in BOOLEAN DEFAULT false;

-- Create index for opt-in status
CREATE INDEX IF NOT EXISTS idx_users_shout_out_opt_in ON public.users(shout_out_opt_in) WHERE shout_out_opt_in = true;

-- Updated_at triggers
CREATE TRIGGER update_shout_outs_updated_at BEFORE UPDATE ON public.shout_outs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shout_out_offers_updated_at BEFORE UPDATE ON public.shout_out_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.shout_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shout_out_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shout_out_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shout_outs
DROP POLICY IF EXISTS "Users can manage own shout-outs" ON public.shout_outs;
CREATE POLICY "Users can manage own shout-outs" ON public.shout_outs
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for shout_out_recipients
DROP POLICY IF EXISTS "Vendors can view their notifications" ON public.shout_out_recipients;
CREATE POLICY "Vendors can view their notifications" ON public.shout_out_recipients
    FOR SELECT USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.shout_out_recipients;
CREATE POLICY "System can create notifications" ON public.shout_out_recipients
    FOR INSERT WITH CHECK (true); -- Allow system to create notifications

DROP POLICY IF EXISTS "Vendors can update their response status" ON public.shout_out_recipients;
CREATE POLICY "Vendors can update their response status" ON public.shout_out_recipients
    FOR UPDATE USING (auth.uid() = vendor_id);

-- RLS Policies for shout_out_offers
DROP POLICY IF EXISTS "Vendors can manage own offers" ON public.shout_out_offers;
CREATE POLICY "Vendors can manage own offers" ON public.shout_out_offers
    FOR ALL USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "Customers can view offers for their shout-outs" ON public.shout_out_offers;
CREATE POLICY "Customers can view offers for their shout-outs" ON public.shout_out_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shout_outs s 
            WHERE s.id = shout_out_offers.shout_out_id 
            AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Customers can accept offers" ON public.shout_out_offers;
CREATE POLICY "Customers can accept offers" ON public.shout_out_offers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.shout_outs s 
            WHERE s.id = shout_out_offers.shout_out_id 
            AND s.user_id = auth.uid()
        )
    );

-- Helper function to find eligible vendors within radius
CREATE OR REPLACE FUNCTION find_eligible_vendors(
    p_service_type TEXT,
    p_location GEOGRAPHY,
    p_radius_km INTEGER
) RETURNS TABLE (
    vendor_id UUID,
    distance_km NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as vendor_id,
        (ST_Distance(pl.location, p_location) / 1000)::NUMERIC as distance_km
    FROM public.users u
    INNER JOIN public.provider_locations pl ON u.id = pl.vendor_id
    INNER JOIN public.services s ON u.id = s.vendor_id
    WHERE 
        u.role = 'vendor'
        AND u.shout_out_opt_in = true
        AND s.category = p_service_type
        AND s.is_active = true
        AND pl.is_active = true
        AND ST_DWithin(pl.location, p_location, p_radius_km * 1000) -- Convert km to meters
    ORDER BY distance_km;
END $$;

-- Helper function to auto-expire old shout-outs
CREATE OR REPLACE FUNCTION expire_old_shout_outs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.shout_outs 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END $$;

-- Function to calculate offer ranking score
CREATE OR REPLACE FUNCTION calculate_offer_score(
    p_distance_km NUMERIC,
    p_vendor_rating NUMERIC,
    p_price_cents INTEGER,
    p_avg_price_cents NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Score based on: distance (lower better), rating (higher better), price (competitive better)
    -- Distance: max 20 points (20 - distance), Rating: max 25 points (rating * 5), Price: max 55 points
    RETURN 
        GREATEST(0, 20 - p_distance_km) + -- Distance score (0-20)
        (COALESCE(p_vendor_rating, 3.0) * 5) + -- Rating score (0-25)  
        CASE 
            WHEN p_avg_price_cents > 0 THEN
                GREATEST(0, 55 * (1 - ABS(p_price_cents - p_avg_price_cents) / p_avg_price_cents))
            ELSE 55
        END; -- Price competitiveness score (0-55)
END $$;
