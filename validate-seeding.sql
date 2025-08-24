-- Week 1 Sprint P03 - Database Seeding Validation
-- Run this in Supabase SQL editor or database client

-- 1) Entity counts
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role='vendor')           AS providers,
  (SELECT COUNT(*) FROM profiles WHERE role='customer') AS pilot_users,
  (SELECT COUNT(*) FROM services)            AS services,
  (SELECT COUNT(*) FROM provider_locations)           AS locations;

-- 2) Non-null critical fields (spot bad seeds)
SELECT id, full_name, email
FROM profiles
WHERE full_name IS NULL OR email IS NULL;

-- 3) Referential integrity (services must link to providers)
SELECT s.id, s.provider_id
FROM services s
LEFT JOIN profiles p ON p.id = s.provider_id
WHERE p.id IS NULL;

-- 4) Price sanity (no negative/zero tiers)
SELECT id, name, price
FROM services
WHERE price <= 0;

-- 5) Geo sanity (lat/lng in Canada-ish bounds)
SELECT id, city, latitude, longitude
FROM provider_locations
WHERE latitude NOT BETWEEN 41.6 AND 83.1
   OR longitude NOT BETWEEN -141.0 AND -52.6;

-- 6) Determinism check (fingerprint a stable sample)
SELECT md5(string_agg(id::text || ':' || full_name, ',' ORDER BY id)) AS providers_fingerprint
FROM profiles WHERE role = 'vendor';

-- 7) Auth users validation
SELECT 
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@pilot.bookiji.com') AS auth_users_created,
  (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@pilot.bookiji.com') AS profiles_created;

-- 8) Sample data verification
SELECT 'Vendors' as type, full_name, email, role FROM profiles WHERE role = 'vendor' LIMIT 3;
SELECT 'Customers' as type, full_name, email, role FROM profiles WHERE role = 'customer' LIMIT 3;
SELECT 'Services' as type, name, price, category FROM services LIMIT 5;
SELECT 'Locations' as type, city, state, country FROM provider_locations LIMIT 3;
