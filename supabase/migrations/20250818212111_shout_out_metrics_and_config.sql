-- Shout-Out v1.5: Metrics, Config, and Notifications
-- Power-ups for the existing shout-out system

-- =====================================================
-- 1. METRICS TRACKING
-- =====================================================

-- Track key events for analytics
CREATE TABLE IF NOT EXISTS public.shout_out_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shout_out_id UUID REFERENCES public.shout_outs(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event TEXT CHECK (event IN ('created', 'offer_sent', 'offer_accepted', 'expired')) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shout_out_metrics_shout_out ON public.shout_out_metrics(shout_out_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_metrics_vendor ON public.shout_out_metrics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_metrics_event ON public.shout_out_metrics(event);
CREATE INDEX IF NOT EXISTS idx_shout_out_metrics_created_at ON public.shout_out_metrics(created_at);

-- Conversion rate view (% of shout-outs that get accepted offers)
CREATE OR REPLACE VIEW public.shout_out_conversion AS
SELECT
    COUNT(*) FILTER (WHERE event = 'offer_accepted')::FLOAT /
    NULLIF(COUNT(*) FILTER (WHERE event = 'created'), 0) AS conversion_rate,
    COUNT(*) FILTER (WHERE event = 'created') AS total_created,
    COUNT(*) FILTER (WHERE event = 'offer_accepted') AS total_accepted
FROM public.shout_out_metrics;

-- Average response time view (time from creation to first offer)
CREATE OR REPLACE VIEW public.shout_out_response_time AS
SELECT 
    AVG(
        EXTRACT(EPOCH FROM (offer.created_at - created.created_at)) / 60
    ) AS avg_response_time_minutes,
    COUNT(*) AS total_responses
FROM public.shout_out_metrics offer
JOIN public.shout_out_metrics created ON offer.shout_out_id = created.shout_out_id
WHERE offer.event = 'offer_sent' 
AND created.event = 'created';

-- Resolution percentage view (% of shout-outs that get at least one offer)
CREATE OR REPLACE VIEW public.shout_out_resolution AS
SELECT
    COUNT(DISTINCT shout_out_id) FILTER (WHERE event = 'offer_sent')::FLOAT /
    NULLIF(COUNT(DISTINCT shout_out_id) FILTER (WHERE event = 'created'), 0) AS resolution_pct,
    COUNT(DISTINCT shout_out_id) FILTER (WHERE event = 'created') AS total_shout_outs,
    COUNT(DISTINCT shout_out_id) FILTER (WHERE event = 'offer_sent') AS total_with_offers
FROM public.shout_out_metrics;

-- =====================================================
-- 2. ADMIN CONFIGURATION
-- =====================================================

-- Configuration table for system-wide shout-out settings
CREATE TABLE IF NOT EXISTS public.shout_out_config (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE, -- Singleton row
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    default_radius_km NUMERIC NOT NULL DEFAULT 10,
    expiry_minutes INTEGER NOT NULL DEFAULT 30,
    max_radius_km NUMERIC NOT NULL DEFAULT 100,
    min_radius_km NUMERIC NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT singleton_check CHECK (id = TRUE)
);

-- Insert default configuration
INSERT INTO public.shout_out_config (id, enabled, default_radius_km, expiry_minutes, max_radius_km, min_radius_km)
VALUES (TRUE, TRUE, 10, 30, 100, 1)
ON CONFLICT (id) DO NOTHING;

-- Updated trigger for config table
CREATE TRIGGER update_shout_out_config_updated_at 
    BEFORE UPDATE ON public.shout_out_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. NOTIFICATION PIPELINE
-- =====================================================

-- Notification queue table
CREATE TABLE IF NOT EXISTS public.shout_out_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    shout_out_id UUID REFERENCES public.shout_outs(id) ON DELETE CASCADE NOT NULL,
    channel TEXT CHECK (channel IN ('in_app', 'email', 'sms')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notification processing
CREATE INDEX IF NOT EXISTS idx_shout_out_notifications_vendor ON public.shout_out_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_notifications_shout_out ON public.shout_out_notifications(shout_out_id);
CREATE INDEX IF NOT EXISTS idx_shout_out_notifications_status ON public.shout_out_notifications(status);
CREATE INDEX IF NOT EXISTS idx_shout_out_notifications_channel ON public.shout_out_notifications(channel);
CREATE INDEX IF NOT EXISTS idx_shout_out_notifications_created_at ON public.shout_out_notifications(created_at);

-- Trigger for notification table
CREATE TRIGGER update_shout_out_notifications_updated_at 
    BEFORE UPDATE ON public.shout_out_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. VENDOR NOTIFICATION PREFERENCES
-- =====================================================

-- Add notification preferences to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_in_app BOOLEAN DEFAULT TRUE;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.shout_out_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shout_out_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shout_out_notifications ENABLE ROW LEVEL SECURITY;

-- Metrics policies
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.shout_out_metrics;
CREATE POLICY "Admins can view all metrics" ON public.shout_out_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "System can insert metrics" ON public.shout_out_metrics;
CREATE POLICY "System can insert metrics" ON public.shout_out_metrics
    FOR INSERT WITH CHECK (true); -- Allow system to insert metrics

-- Config policies
DROP POLICY IF EXISTS "Admins can manage config" ON public.shout_out_config;
CREATE POLICY "Admins can manage config" ON public.shout_out_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Anyone can read config" ON public.shout_out_config;
CREATE POLICY "Anyone can read config" ON public.shout_out_config
    FOR SELECT USING (true); -- Config is readable by all authenticated users

-- Notification policies
DROP POLICY IF EXISTS "Vendors can view own notifications" ON public.shout_out_notifications;
CREATE POLICY "Vendors can view own notifications" ON public.shout_out_notifications
    FOR SELECT USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "System can manage notifications" ON public.shout_out_notifications;
CREATE POLICY "System can manage notifications" ON public.shout_out_notifications
    FOR ALL USING (true); -- Allow system to manage notifications

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get current shout-out configuration
CREATE OR REPLACE FUNCTION get_shout_out_config()
RETURNS TABLE (
    enabled BOOLEAN,
    default_radius_km NUMERIC,
    expiry_minutes INTEGER,
    max_radius_km NUMERIC,
    min_radius_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.enabled,
        c.default_radius_km,
        c.expiry_minutes,
        c.max_radius_km,
        c.min_radius_km
    FROM public.shout_out_config c
    WHERE c.id = TRUE;
END $$;

-- Function to record shout-out metrics
CREATE OR REPLACE FUNCTION record_shout_out_metric(
    p_shout_out_id UUID,
    p_vendor_id UUID,
    p_event TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO public.shout_out_metrics (
        shout_out_id,
        vendor_id,
        event,
        metadata
    ) VALUES (
        p_shout_out_id,
        p_vendor_id,
        p_event,
        p_metadata
    )
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END $$;

-- Function to create vendor notifications
CREATE OR REPLACE FUNCTION create_vendor_notifications(
    p_shout_out_id UUID,
    p_vendor_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    vendor_id UUID;
    vendor_record RECORD;
    notification_count INTEGER := 0;
BEGIN
    -- Loop through each vendor and create appropriate notifications
    FOREACH vendor_id IN ARRAY p_vendor_ids
    LOOP
        -- Get vendor notification preferences
        SELECT 
            notification_in_app,
            notification_email,
            notification_sms,
            email,
            phone
        INTO vendor_record
        FROM public.users
        WHERE id = vendor_id;
        
        -- Create in-app notification (always)
        INSERT INTO public.shout_out_notifications (
            vendor_id,
            shout_out_id,
            channel,
            status
        ) VALUES (
            vendor_id,
            p_shout_out_id,
            'in_app',
            'pending'
        );
        notification_count := notification_count + 1;
        
        -- Create email notification if enabled and email exists
        IF vendor_record.notification_email AND vendor_record.email IS NOT NULL THEN
            INSERT INTO public.shout_out_notifications (
                vendor_id,
                shout_out_id,
                channel,
                status,
                metadata
            ) VALUES (
                vendor_id,
                p_shout_out_id,
                'email',
                'pending',
                jsonb_build_object('email', vendor_record.email)
            );
            notification_count := notification_count + 1;
        END IF;
        
        -- Create SMS notification if enabled and phone exists
        IF vendor_record.notification_sms AND vendor_record.phone IS NOT NULL THEN
            INSERT INTO public.shout_out_notifications (
                vendor_id,
                shout_out_id,
                channel,
                status,
                metadata
            ) VALUES (
                vendor_id,
                p_shout_out_id,
                'sms',
                'pending',
                jsonb_build_object('phone', vendor_record.phone)
            );
            notification_count := notification_count + 1;
        END IF;
    END LOOP;
    
    RETURN notification_count;
END $$;

-- Function to get pending notifications for processing
CREATE OR REPLACE FUNCTION get_pending_notifications(
    p_channel TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    vendor_id UUID,
    shout_out_id UUID,
    channel TEXT,
    metadata JSONB,
    vendor_email TEXT,
    vendor_phone TEXT,
    vendor_name TEXT,
    shout_out_service_type TEXT,
    shout_out_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.vendor_id,
        n.shout_out_id,
        n.channel,
        n.metadata,
        u.email AS vendor_email,
        u.phone AS vendor_phone,
        u.full_name AS vendor_name,
        s.service_type AS shout_out_service_type,
        s.description AS shout_out_description
    FROM public.shout_out_notifications n
    JOIN public.users u ON n.vendor_id = u.id
    JOIN public.shout_outs s ON n.shout_out_id = s.id
    WHERE n.status = 'pending'
    AND (p_channel IS NULL OR n.channel = p_channel)
    AND s.status = 'active'
    AND s.expires_at > NOW()
    ORDER BY n.created_at ASC
    LIMIT p_limit;
END $$;
