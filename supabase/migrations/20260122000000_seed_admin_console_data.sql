-- Seed data for admin console visibility
-- This migration adds sample data across all admin panels and screens

BEGIN;

-- Helper function to generate random timestamps in the past
DO $$
DECLARE
  v_admin_user_id UUID;
  v_customer_ids UUID[] := ARRAY[]::UUID[];
  v_vendor_ids UUID[] := ARRAY[]::UUID[];
  v_service_ids UUID[] := ARRAY[]::UUID[];
  v_booking_ids UUID[] := ARRAY[]::UUID[];
  v_instance_id UUID;
  v_user_id UUID;
  v_customer_id UUID;
  v_vendor_id UUID;
  v_service_id UUID;
  v_booking_id UUID;
  v_booking_status TEXT;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  i INTEGER;
  v_timestamp TIMESTAMPTZ;
BEGIN
  -- Get instance ID
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Get admin user ID (should exist from previous migration)
  SELECT id INTO v_admin_user_id FROM profiles WHERE role = 'admin' LIMIT 1;

  -- ========================================
  -- 1. CREATE CUSTOMER USERS
  -- ========================================
  FOR i IN 1..15 LOOP
    v_user_id := gen_random_uuid();
    v_timestamp := NOW() - (random() * INTERVAL '30 days');
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    )
    VALUES (
      v_user_id, v_instance_id,
      'customer' || i || '@example.com',
      crypt('password123', gen_salt('bf')),
      v_timestamp,
      v_timestamp, v_timestamp,
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated', 'authenticated', ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('email', 'customer' || i || '@example.com'),
      'email', v_user_id::TEXT, v_timestamp, v_timestamp
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- Insert into profiles
    INSERT INTO profiles (
      id, auth_user_id, email, full_name, username, role, phone,
      created_at, updated_at
    )
    VALUES (
      v_user_id, v_user_id,
      'customer' || i || '@example.com',
      'Customer ' || i || ' Name',
      'customer' || i,
      'customer',
      '+1-555-' || LPAD((1000 + i)::TEXT, 4, '0'),
      v_timestamp, v_timestamp
    )
    ON CONFLICT (id) DO NOTHING;

    v_customer_ids := array_append(v_customer_ids, v_user_id);
  END LOOP;

  -- ========================================
  -- 2. CREATE VENDOR USERS
  -- ========================================
  FOR i IN 1..10 LOOP
    v_user_id := gen_random_uuid();
    v_timestamp := NOW() - (random() * INTERVAL '60 days');
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      aud, role, confirmation_token
    )
    VALUES (
      v_user_id, v_instance_id,
      'vendor' || i || '@example.com',
      crypt('password123', gen_salt('bf')),
      v_timestamp,
      v_timestamp, v_timestamp,
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated', 'authenticated', ''
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('email', 'vendor' || i || '@example.com'),
      'email', v_user_id::TEXT, v_timestamp, v_timestamp
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- Insert into profiles with vendor details
    INSERT INTO profiles (
      id, auth_user_id, email, full_name, username, role, phone,
      bio, hourly_rate, rating, experience_years,
      created_at, updated_at
    )
    VALUES (
      v_user_id, v_user_id,
      'vendor' || i || '@example.com',
      'Vendor ' || i || ' Name',
      'vendor' || i,
      'vendor',
      '+1-555-' || LPAD((2000 + i)::TEXT, 4, '0'),
      'Professional service provider with ' || (5 + i) || ' years of experience',
      (50.00 + (i * 10.00)),
      (3.5 + (random() * 1.5))::DECIMAL(3,2),
      (5 + i),
      v_timestamp, v_timestamp
    )
    ON CONFLICT (id) DO NOTHING;

    v_vendor_ids := array_append(v_vendor_ids, v_user_id);
  END LOOP;

  -- ========================================
  -- 3. CREATE SERVICES FOR VENDORS
  -- ========================================
  FOR i IN 1..array_length(v_vendor_ids, 1) LOOP
    v_vendor_id := v_vendor_ids[i];
    
    -- Create 2-3 services per vendor
    FOR j IN 1..(2 + (random() * 2)::INTEGER) LOOP
      v_service_id := gen_random_uuid();
      v_timestamp := NOW() - (random() * INTERVAL '45 days');
      
      INSERT INTO services (
        id, provider_id, name, description, category, subcategory,
        price, price_type, duration_minutes, is_active,
        created_at, updated_at
      )
      VALUES (
        v_service_id, v_vendor_id,
        CASE (j % 4)
          WHEN 0 THEN 'Home Cleaning Service'
          WHEN 1 THEN 'Plumbing Repair'
          WHEN 2 THEN 'Electrical Installation'
          ELSE 'Landscaping Service'
        END,
        'Professional ' || CASE (j % 4)
          WHEN 0 THEN 'home cleaning'
          WHEN 1 THEN 'plumbing repair'
          WHEN 2 THEN 'electrical installation'
          ELSE 'landscaping'
        END || ' service',
        CASE (j % 3)
          WHEN 0 THEN 'Home Services'
          WHEN 1 THEN 'Repair'
          ELSE 'Maintenance'
        END,
        CASE (j % 2)
          WHEN 0 THEN 'Basic'
          ELSE 'Premium'
        END,
        (100.00 + (random() * 200.00))::DECIMAL(8,2),
        CASE (j % 3)
          WHEN 0 THEN 'fixed'
          WHEN 1 THEN 'hourly'
          ELSE 'per_item'
        END,
        (60 + (random() * 180)::INTEGER),
        true,
        v_timestamp, v_timestamp
      )
      ON CONFLICT (id) DO NOTHING;

      v_service_ids := array_append(v_service_ids, v_service_id);
    END LOOP;
  END LOOP;

  -- ========================================
  -- 4. CREATE BOOKINGS
  -- ========================================
  FOR i IN 1..50 LOOP
    v_booking_id := gen_random_uuid();
    v_customer_id := v_customer_ids[1 + (random() * (array_length(v_customer_ids, 1) - 1))::INTEGER];
    v_vendor_id := v_vendor_ids[1 + (random() * (array_length(v_vendor_ids, 1) - 1))::INTEGER];
    
    -- Get a service for this vendor
    SELECT id INTO v_service_id FROM services 
    WHERE provider_id = v_vendor_id 
    ORDER BY random() 
    LIMIT 1;
    
    IF v_service_id IS NULL THEN
      CONTINUE;
    END IF;
    
    v_timestamp := NOW() - (random() * INTERVAL '20 days');
    
    -- Create booking with various statuses
    -- For pending/confirmed: use future dates, for completed/cancelled/no_show: use past dates
    v_booking_status := CASE (i % 5)
      WHEN 0 THEN 'pending'
      WHEN 1 THEN 'confirmed'
      WHEN 2 THEN 'completed'
      WHEN 3 THEN 'cancelled'
      ELSE 'no_show'
    END;
    
    -- Future bookings for pending/confirmed, past for others
    IF v_booking_status IN ('pending', 'confirmed') THEN
      v_start_time := NOW() + (random() * INTERVAL '30 days');
      v_end_time := v_start_time + INTERVAL '2 hours';
    ELSE
      v_start_time := NOW() - (random() * INTERVAL '30 days');
      v_end_time := v_start_time + INTERVAL '2 hours';
    END IF;
    
    INSERT INTO bookings (
      id, customer_id, provider_id, service_id,
      start_time, end_time, status, total_amount,
      notes, created_at, updated_at
    )
    VALUES (
      v_booking_id, v_customer_id, v_vendor_id, v_service_id,
      v_start_time, v_end_time, v_booking_status,
      (50.00 + (random() * 500.00))::DECIMAL(8,2),
      'Booking notes for service ' || i,
      v_timestamp, v_timestamp
    )
    ON CONFLICT (id) DO NOTHING;

    v_booking_ids := array_append(v_booking_ids, v_booking_id);
  END LOOP;

  -- ========================================
  -- 5. CREATE AVAILABILITY SLOTS FOR VENDORS
  -- ========================================
  FOR i IN 1..array_length(v_vendor_ids, 1) LOOP
    v_vendor_id := v_vendor_ids[i];
    
    -- Create 10-20 availability slots per vendor (mix of past and future)
    FOR j IN 1..(10 + (random() * 10)::INTEGER) LOOP
      v_timestamp := NOW() + (random() * INTERVAL '60 days') - INTERVAL '30 days';
      
      INSERT INTO availability_slots (
        id, provider_id, start_time, end_time,
        is_available, slot_type,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), v_vendor_id,
        v_timestamp,
        v_timestamp + INTERVAL '2 hours',
        (random() > 0.2), -- 80% available
        CASE (j % 3)
          WHEN 0 THEN 'regular'
          WHEN 1 THEN 'blocked'
          ELSE 'maintenance'
        END,
        v_timestamp - INTERVAL '1 day',
        v_timestamp - INTERVAL '1 day'
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;

  -- ========================================
  -- 6. CREATE REVIEWS FOR COMPLETED BOOKINGS
  -- ========================================
  FOR i IN 1..20 LOOP
    -- Get a completed booking
    SELECT id, customer_id, provider_id INTO v_booking_id, v_customer_id, v_vendor_id
    FROM bookings 
    WHERE status = 'completed' 
    ORDER BY random() 
    LIMIT 1;
    
    IF v_booking_id IS NULL THEN
      CONTINUE;
    END IF;
    
    v_timestamp := NOW() - (random() * INTERVAL '15 days');
    
    INSERT INTO reviews (
      id, booking_id, reviewer_id, provider_id,
      rating, comment, is_verified,
      created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_booking_id, v_customer_id, v_vendor_id,
      (3 + (random() * 2)::INTEGER),
      'Great service! Highly recommend.',
      (random() > 0.5),
      v_timestamp, v_timestamp
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- ========================================
  -- 7. CREATE ERROR LOGS
  -- ========================================
  -- Check if error_log table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'error_log') THEN
    FOR i IN 1..10 LOOP
      v_timestamp := NOW() - (random() * INTERVAL '24 hours');
      
      INSERT INTO error_log (
        endpoint, error_type, message, severity,
        occurrences, first_seen, last_seen
      )
      VALUES (
        CASE (i % 3)
          WHEN 0 THEN '/api/bookings/create'
          WHEN 1 THEN '/api/services/list'
          ELSE '/api/vendors/search'
        END,
        CASE (i % 3)
          WHEN 0 THEN 'API_ERROR'
          WHEN 1 THEN 'VALIDATION_ERROR'
          ELSE 'DATABASE_ERROR'
        END,
        'Sample error message ' || i,
        CASE (i % 3)
          WHEN 0 THEN 'error'
          WHEN 1 THEN 'warning'
          ELSE 'critical'
        END,
        (1 + (random() * 5)::INTEGER),
        v_timestamp,
        v_timestamp
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- ========================================
  -- 8. CREATE SUPPORT TICKETS
  -- ========================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    FOR i IN 1..8 LOOP
      v_timestamp := NOW() - (random() * INTERVAL '7 days');
      v_customer_id := v_customer_ids[1 + (random() * (array_length(v_customer_ids, 1) - 1))::INTEGER];
      
      INSERT INTO support_tickets (
        id, user_id, title, description, status, priority,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), v_customer_id,
        'Support Ticket ' || i,
        'Customer needs help with ' || CASE (i % 3)
          WHEN 0 THEN 'booking issue'
          WHEN 1 THEN 'payment problem'
          ELSE 'account access'
        END,
        CASE (i % 4)
          WHEN 0 THEN 'open'
          WHEN 1 THEN 'in_progress'
          WHEN 2 THEN 'resolved'
          ELSE 'closed'
        END,
        CASE (i % 4)
          WHEN 0 THEN 'low'
          WHEN 1 THEN 'medium'
          WHEN 2 THEN 'high'
          ELSE 'urgent'
        END,
        v_timestamp, v_timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;

  RAISE NOTICE 'Admin console data seeded successfully';
  RAISE NOTICE 'Created % customers', array_length(v_customer_ids, 1);
  RAISE NOTICE 'Created % vendors', array_length(v_vendor_ids, 1);
  RAISE NOTICE 'Created % services', array_length(v_service_ids, 1);
  RAISE NOTICE 'Created % bookings', array_length(v_booking_ids, 1);

END $$;

COMMIT;
