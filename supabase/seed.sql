BEGIN;

WITH vendor_base(idx, latitude, longitude) AS (
  VALUES
    (1, 45.4971, -73.5689),
    (2, 45.4995, -73.5771),
    (3, 45.5019, -73.5728),
    (4, 45.5065, -73.5662),
    (5, 45.5042, -73.5775),
    (6, 45.5135, -73.5590),
    (7, 45.4960, -73.5690),
    (8, 45.5012, -73.5741),
    (9, 45.5265, -73.5800),
    (10, 45.5160, -73.5630),
    (11, 45.4880, -73.5860),
    (12, 45.5090, -73.5700),
    (13, 45.5260, -73.5520),
    (14, 45.5210, -73.5595),
    (15, 45.4885, -73.5650),
    (16, 45.5178, -73.5699),
    (17, 45.4922, -73.5780),
    (18, 45.4978, -73.5772),
    (19, 45.5240, -73.5870),
    (20, 45.5150, -73.5680)
),
vendors AS (
  INSERT INTO public.users (email, role, full_name)
  SELECT
    'vendor' || idx || '@example.com',
    'vendor',
    'Vendor ' || idx
  FROM vendor_base
  RETURNING id, idx
),
services AS (
  INSERT INTO public.services (vendor_id, name, description, duration_minutes, price_cents, category)
  SELECT
    v.id,
    'Service ' || v.idx,
    'Test service ' || v.idx,
    60,
    2000,
    'test'
  FROM vendors v
  RETURNING id, vendor_id, idx
),
locations AS (
  INSERT INTO public.provider_locations (vendor_id, latitude, longitude, service_radius_km, is_active)
  SELECT
    v.id,
    b.latitude,
    b.longitude,
    5,
    true
  FROM vendors v
  JOIN vendor_base b ON v.idx = b.idx
),
customers_raw AS (
  INSERT INTO public.users (email, role, full_name)
  SELECT
    'customer' || i || '@example.com',
    'customer',
    'Customer ' || i
  FROM generate_series(1, 50) AS g(i)
  RETURNING id
),
customers AS (
  SELECT id, ROW_NUMBER() OVER () AS rn FROM customers_raw
),
slot_raw AS (
  INSERT INTO public.availability_slots (vendor_id, service_id, start_time, end_time, is_booked)
  SELECT
    s.vendor_id,
    s.id,
    NOW() + INTERVAL '1 day' + ((s.idx - 1) * INTERVAL '2 hour') + ((j - 1) * INTERVAL '1 hour'),
    NOW() + INTERVAL '1 day' + ((s.idx - 1) * INTERVAL '2 hour') + (j * INTERVAL '1 hour'),
    false
  FROM services s,
    generate_series(1, 3) AS j
  RETURNING id, vendor_id, service_id, start_time, end_time
),
slots AS (
  SELECT *, ROW_NUMBER() OVER () AS rn FROM slot_raw
),
bookings_insert AS (
  INSERT INTO public.bookings (customer_id, vendor_id, service_id, slot_id, slot_start, slot_end, status, total_amount_cents)
  SELECT
    c.id,
    sl.vendor_id,
    sl.service_id,
    sl.id,
    sl.start_time,
    sl.end_time,
    'confirmed',
    2000
  FROM customers c
  JOIN slots sl ON sl.rn = c.rn
  LIMIT 50
  RETURNING slot_id
)
UPDATE public.availability_slots
SET is_booked = true
WHERE id IN (SELECT slot_id FROM bookings_insert);

COMMIT;
