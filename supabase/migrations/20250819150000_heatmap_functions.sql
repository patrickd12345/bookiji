-- Create function to get booking heatmap data
CREATE OR REPLACE FUNCTION get_booking_heatmap_data(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_service_type VARCHAR DEFAULT NULL,
  p_min_bookings INTEGER DEFAULT 1,
  p_radius_km FLOAT DEFAULT NULL,
  p_center_lat FLOAT DEFAULT NULL,
  p_center_lng FLOAT DEFAULT NULL
)
RETURNS TABLE (
  postal_code VARCHAR(20),
  latitude FLOAT,
  longitude FLOAT,
  booking_count BIGINT,
  revenue DECIMAL(10,2),
  avg_rating DECIMAL(3,2),
  unique_providers BIGINT,
  last_booking TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH booking_data AS (
    SELECT 
      b.postal_code,
      b.latitude,
      b.longitude,
      b.total_amount,
      b.created_at,
      b.provider_id,
      u.rating
    FROM bookings b
    LEFT JOIN users u ON b.provider_id = u.id
    WHERE 
      b.created_at >= p_start_date
      AND b.created_at <= p_end_date
      AND b.postal_code IS NOT NULL
      AND b.latitude IS NOT NULL
      AND b.longitude IS NOT NULL
      AND b.status IN ('confirmed', 'completed', 'paid')
      AND (p_service_type IS NULL OR b.service_type = p_service_type)
      AND (
        p_radius_km IS NULL 
        OR p_center_lat IS NULL 
        OR p_center_lng IS NULL
        OR (
          -- Calculate distance using Haversine formula (approximate)
          6371 * acos(
            cos(radians(p_center_lat)) * 
            cos(radians(b.latitude)) * 
            cos(radians(b.longitude) - radians(p_center_lng)) + 
            sin(radians(p_center_lat)) * 
            sin(radians(b.latitude))
          ) <= p_radius_km
        )
      )
  ),
  aggregated_data AS (
    SELECT 
      bd.postal_code,
      AVG(bd.latitude) as avg_latitude,
      AVG(bd.longitude) as avg_longitude,
      COUNT(*) as total_bookings,
      SUM(bd.total_amount) as total_revenue,
      AVG(bd.rating) as average_rating,
      COUNT(DISTINCT bd.provider_id) as provider_count,
      MAX(bd.created_at) as latest_booking
    FROM booking_data bd
    GROUP BY bd.postal_code
    HAVING COUNT(*) >= p_min_bookings
  )
  SELECT 
    ad.postal_code,
    ad.avg_latitude::FLOAT,
    ad.avg_longitude::FLOAT,
    ad.total_bookings,
    ad.total_revenue::DECIMAL(10,2),
    COALESCE(ad.average_rating, 0)::DECIMAL(3,2),
    ad.provider_count,
    ad.latest_booking
  FROM aggregated_data ad
  ORDER BY ad.total_bookings DESC, ad.total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get provider density heatmap
CREATE OR REPLACE FUNCTION get_provider_density_heatmap(
  p_service_type VARCHAR DEFAULT NULL,
  p_radius_km FLOAT DEFAULT NULL,
  p_center_lat FLOAT DEFAULT NULL,
  p_center_lng FLOAT DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  postal_code VARCHAR(20),
  latitude FLOAT,
  longitude FLOAT,
  provider_count BIGINT,
  avg_rating DECIMAL(3,2),
  avg_price DECIMAL(8,2),
  service_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH provider_data AS (
    SELECT 
      pl.postal_code,
      pl.latitude,
      pl.longitude,
      u.id as provider_id,
      u.rating,
      s.service_type,
      s.base_price
    FROM provider_locations pl
    JOIN users u ON pl.user_id = u.id
    LEFT JOIN services s ON u.id = s.provider_id
    WHERE 
      u.role = 'provider'
      AND u.is_active = true
      AND pl.postal_code IS NOT NULL
      AND pl.latitude IS NOT NULL
      AND pl.longitude IS NOT NULL
      AND (p_service_type IS NULL OR s.service_type = p_service_type)
      AND (p_min_rating IS NULL OR u.rating >= p_min_rating)
      AND (
        p_radius_km IS NULL 
        OR p_center_lat IS NULL 
        OR p_center_lng IS NULL
        OR (
          -- Calculate distance using Haversine formula
          6371 * acos(
            cos(radians(p_center_lat)) * 
            cos(radians(pl.latitude)) * 
            cos(radians(pl.longitude) - radians(p_center_lng)) + 
            sin(radians(p_center_lat)) * 
            sin(radians(pl.latitude))
          ) <= p_radius_km
        )
      )
  ),
  aggregated_providers AS (
    SELECT 
      pd.postal_code,
      AVG(pd.latitude) as avg_latitude,
      AVG(pd.longitude) as avg_longitude,
      COUNT(DISTINCT pd.provider_id) as total_providers,
      AVG(pd.rating) as average_rating,
      AVG(pd.base_price) as average_price,
      array_agg(DISTINCT pd.service_type) FILTER (WHERE pd.service_type IS NOT NULL) as service_type_list
    FROM provider_data pd
    GROUP BY pd.postal_code
  )
  SELECT 
    ap.postal_code,
    ap.avg_latitude::FLOAT,
    ap.avg_longitude::FLOAT,
    ap.total_providers,
    COALESCE(ap.average_rating, 0)::DECIMAL(3,2),
    COALESCE(ap.average_price, 0)::DECIMAL(8,2),
    COALESCE(ap.service_type_list, ARRAY[]::TEXT[])
  FROM aggregated_providers ap
  ORDER BY ap.total_providers DESC, ap.average_rating DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get service demand heatmap
CREATE OR REPLACE FUNCTION get_demand_heatmap(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_service_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  postal_code VARCHAR(20),
  latitude FLOAT,
  longitude FLOAT,
  search_count BIGINT,
  booking_count BIGINT,
  conversion_rate DECIMAL(5,2),
  avg_search_radius DECIMAL(8,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH search_data AS (
    SELECT 
      search_postal_code as postal_code,
      search_latitude as latitude,
      search_longitude as longitude,
      search_radius,
      service_type,
      created_at
    FROM search_logs
    WHERE 
      created_at >= p_start_date
      AND created_at <= p_end_date
      AND search_postal_code IS NOT NULL
      AND (p_service_type IS NULL OR service_type = p_service_type)
  ),
  booking_data AS (
    SELECT 
      postal_code,
      latitude,
      longitude,
      service_type,
      created_at
    FROM bookings
    WHERE 
      created_at >= p_start_date
      AND created_at <= p_end_date
      AND postal_code IS NOT NULL
      AND status IN ('confirmed', 'completed', 'paid')
      AND (p_service_type IS NULL OR service_type = p_service_type)
  ),
  aggregated_demand AS (
    SELECT 
      COALESCE(sd.postal_code, bd.postal_code) as postal_code,
      COALESCE(sd.latitude, bd.latitude) as latitude,
      COALESCE(sd.longitude, bd.longitude) as longitude,
      COUNT(sd.*) as total_searches,
      COUNT(bd.*) as total_bookings,
      AVG(sd.search_radius) as avg_radius
    FROM search_data sd
    FULL OUTER JOIN booking_data bd ON sd.postal_code = bd.postal_code
    GROUP BY COALESCE(sd.postal_code, bd.postal_code), 
             COALESCE(sd.latitude, bd.latitude),
             COALESCE(sd.longitude, bd.longitude)
  )
  SELECT 
    ad.postal_code,
    ad.latitude::FLOAT,
    ad.longitude::FLOAT,
    COALESCE(ad.total_searches, 0),
    COALESCE(ad.total_bookings, 0),
    CASE 
      WHEN ad.total_searches > 0 THEN 
        (ad.total_bookings::DECIMAL / ad.total_searches * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END as conversion_rate,
    COALESCE(ad.avg_radius, 0)::DECIMAL(8,2)
  FROM aggregated_demand ad
  WHERE ad.total_searches > 0 OR ad.total_bookings > 0
  ORDER BY ad.total_searches DESC, ad.total_bookings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_booking_heatmap_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_density_heatmap TO authenticated;
GRANT EXECUTE ON FUNCTION get_demand_heatmap TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_postal_code_created_at ON bookings(postal_code, created_at) WHERE postal_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_location ON bookings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_locations_postal_code ON provider_locations(postal_code) WHERE postal_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_locations_location ON provider_locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create search_logs table if it doesn't exist (for demand analysis)
CREATE TABLE IF NOT EXISTS search_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_type VARCHAR(100),
  search_query TEXT,
  search_postal_code VARCHAR(20),
  search_latitude DECIMAL(10,8),
  search_longitude DECIMAL(11,8),
  search_radius DECIMAL(8,2),
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for search_logs
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_postal_code ON search_logs(search_postal_code) WHERE search_postal_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_logs_service_type ON search_logs(service_type);

-- Enable RLS on search_logs
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for search_logs
CREATE POLICY "Users can view own search logs" ON search_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert search logs" ON search_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all search logs" ON search_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

GRANT SELECT, INSERT ON search_logs TO authenticated;
