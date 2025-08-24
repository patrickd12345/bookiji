-- Pilot Data Seeding Script
-- This script creates deterministic seeds for 5 real vendors + 20 pilot users

-- Clear existing data (idempotent)
DELETE FROM services WHERE provider_id IN (SELECT id FROM profiles WHERE email LIKE '%@pilot.bookiji.com');
DELETE FROM provider_locations WHERE provider_id IN (SELECT id FROM profiles WHERE email LIKE '%@pilot.bookiji.com');
DELETE FROM profiles WHERE email LIKE '%@pilot.bookiji.com';

-- Create auth users first (required for profiles table)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, aud, role) VALUES
-- Vendor auth users
('550e8400-e29b-41d4-a716-446655440001', 'vendor1@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440002', 'vendor2@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440003', 'vendor3@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440004', 'vendor4@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440005', 'vendor5@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),

-- Customer auth users
('550e8400-e29b-41d4-a716-446655440101', 'user1@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440102', 'user2@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440103', 'user3@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440104', 'user4@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440105', 'user5@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440106', 'user6@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440107', 'user7@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440108', 'user8@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440109', 'user9@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-44665544010a', 'user10@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-44665544010b', 'user11@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-44665544010c', 'user12@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-44665544010d', 'user13@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-44665544010e', 'user14@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-44665544010f', 'user15@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440110', 'user16@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440111', 'user17@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440112', 'user18@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440113', 'user19@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated'),
('550e8400-e29b-41d4-a716-446655440114', 'user20@pilot.bookiji.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', 'authenticated', 'authenticated');

-- Insert vendor profiles (5 vendors) - now with auth_user_id
INSERT INTO profiles (id, auth_user_id, email, full_name, role, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'vendor1@pilot.bookiji.com', 'Style Studio Montreal', 'vendor', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'vendor2@pilot.bookiji.com', 'Elite Barbershop', 'vendor', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'vendor3@pilot.bookiji.com', 'Beauty Haven', 'vendor', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'vendor4@pilot.bookiji.com', 'Urban Cuts', 'vendor', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'vendor5@pilot.bookiji.com', 'Prestige Salon', 'vendor', NOW(), NOW());

-- Insert user profiles (20 pilot users) - now with auth_user_id
INSERT INTO profiles (id, auth_user_id, email, full_name, role, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440101', 'user1@pilot.bookiji.com', 'John Smith', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440102', 'user2@pilot.bookiji.com', 'Sarah Johnson', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440103', 'user3@pilot.bookiji.com', 'Michael Brown', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440104', 'user4@pilot.bookiji.com', 'Emily Davis', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440105', 'user5@pilot.bookiji.com', 'David Wilson', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440106', 'user6@pilot.bookiji.com', 'Lisa Anderson', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440107', 'user7@pilot.bookiji.com', 'James Taylor', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440108', 'user8@pilot.bookiji.com', 'Jennifer Martinez', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440109', '550e8400-e29b-41d4-a716-446655440109', 'user9@pilot.bookiji.com', 'Robert Garcia', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544010a', '550e8400-e29b-41d4-a716-44665544010a', 'user10@pilot.bookiji.com', 'Amanda Rodriguez', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544010b', '550e8400-e29b-41d4-a716-44665544010b', 'user11@pilot.bookiji.com', 'Christopher Lee', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544010c', '550e8400-e29b-41d4-a716-44665544010c', 'user12@pilot.bookiji.com', 'Jessica White', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544010d', '550e8400-e29b-41d4-a716-44665544010d', 'user13@pilot.bookiji.com', 'Daniel Harris', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544010e', '550e8400-e29b-41d4-a716-44665544010e', 'user14@pilot.bookiji.com', 'Ashley Clark', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544010f', '550e8400-e29b-41d4-a716-44665544010f', 'user15@pilot.bookiji.com', 'Matthew Lewis', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440110', '550e8400-e29b-41d4-a716-446655440110', 'user16@pilot.bookiji.com', 'Nicole Robinson', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440111', '550e8400-e29b-41d4-a716-446655440111', 'user17@pilot.bookiji.com', 'Andrew Walker', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440112', '550e8400-e29b-41d4-a716-446655440112', 'user18@pilot.bookiji.com', 'Stephanie Perez', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440113', '550e8400-e29b-41d4-a716-446655440113', 'user19@pilot.bookiji.com', 'Kevin Hall', 'customer', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440114', '550e8400-e29b-41d4-a716-446655440114', 'user20@pilot.bookiji.com', 'Rachel Young', 'customer', NOW(), NOW());

-- Insert provider locations (5 cities)
INSERT INTO provider_locations (id, provider_id, address, city, state, country, postal_code, latitude, longitude, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001', '1234 St. Catherine St', 'Montreal', 'QC', 'Canada', 'H2L 2G5', 45.5017, -73.5673, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', '567 Queen St W', 'Toronto', 'ON', 'Canada', 'M5V 2B4', 43.6532, -79.3832, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440003', '890 Granville St', 'Vancouver', 'BC', 'Canada', 'V6Z 1K3', 49.2827, -123.1207, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440004', '234 8th Ave SW', 'Calgary', 'AB', 'Canada', 'T2P 1B3', 51.0447, -114.0719, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440005', '456 Bank St', 'Ottawa', 'ON', 'Canada', 'K2P 1X7', 45.4215, -75.6972, NOW(), NOW());

-- Insert services (3 services per vendor = 15 total)
INSERT INTO services (id, provider_id, name, description, price, duration_minutes, category, created_at, updated_at) VALUES
-- Vendor 1 (Style Studio Montreal)
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', 'Haircut', 'Professional hair cutting service', 35.00, 45, 'haircut', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440001', 'Premium haircut', 'Premium hair cutting with styling', 45.00, 60, 'haircut', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440001', 'Express haircut', 'Quick hair cutting service', 25.00, 30, 'haircut', NOW(), NOW()),

-- Vendor 2 (Elite Barbershop)
('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440002', 'Haircut', 'Professional men''s haircut', 40.00, 45, 'haircut', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440305', '550e8400-e29b-41d4-a716-446655440002', 'Premium haircut', 'Premium men''s haircut with styling', 50.00, 60, 'haircut', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440306', '550e8400-e29b-41d4-a716-446655440002', 'Express haircut', 'Quick men''s haircut', 30.00, 30, 'haircut', NOW(), NOW()),

-- Vendor 3 (Beauty Haven)
('550e8400-e29b-41d4-a716-446655440307', '550e8400-e29b-41d4-a716-446655440003', 'Styling', 'Professional hair styling', 45.00, 60, 'styling', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440308', '550e8400-e29b-41d4-a716-446655440003', 'Premium styling', 'Premium hair styling with consultation', 55.00, 75, 'styling', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440309', '550e8400-e29b-41d4-a716-446655440003', 'Express styling', 'Quick hair styling', 35.00, 45, 'styling', NOW(), NOW()),

-- Vendor 4 (Urban Cuts)
('550e8400-e29b-41d4-a716-44665544030a', '550e8400-e29b-41d4-a716-446655440004', 'Haircut', 'Modern haircut for all ages', 30.00, 45, 'haircut', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544030b', '550e8400-e29b-41d4-a716-446655440004', 'Premium haircut', 'Premium haircut with styling', 40.00, 60, 'haircut', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544030c', '550e8400-e29b-41d4-a716-446655440004', 'Express haircut', 'Quick haircut service', 20.00, 30, 'haircut', NOW(), NOW()),

-- Vendor 5 (Prestige Salon)
('550e8400-e29b-41d4-a716-44665544030d', '550e8400-e29b-41d4-a716-446655440005', 'Coloring', 'Professional hair coloring', 60.00, 90, 'coloring', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544030e', '550e8400-e29b-41d4-a716-446655440005', 'Premium coloring', 'Premium hair coloring with treatment', 75.00, 120, 'coloring', NOW(), NOW()),
('550e8400-e29b-41d4-a716-44665544030f', '550e8400-e29b-41d4-a716-446655440005', 'Express coloring', 'Quick hair coloring', 45.00, 60, 'coloring', NOW(), NOW());

-- Summary
SELECT 
  'Seeding completed successfully!' as status,
  (SELECT COUNT(*) FROM profiles WHERE role = 'vendor') as providers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'customer') as pilot_users,
  (SELECT COUNT(*) FROM services) as services,
  (SELECT COUNT(*) FROM provider_locations) as locations;
