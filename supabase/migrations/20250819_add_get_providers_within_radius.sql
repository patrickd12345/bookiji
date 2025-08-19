-- Requires: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION get_providers_within_radius(
  p_latitude  DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION
)
RETURNS TABLE (
  provider_id UUID,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS provider_id,
    ST_DistanceSphere(
      location::geometry,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
    ) / 1000.0 AS distance_km
  FROM providers
  WHERE is_active = TRUE
    AND ST_DWithin(
      location,
      geography(ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)),
      (p_radius_km * 1000.0)
    )
  ORDER BY distance_km ASC;
END;
$$;

COMMENT ON FUNCTION get_providers_within_radius IS
'Returns active providers within p_radius_km of (lat,lng). Requires providers(location GEOGRAPHY(POINT,4326)).';