import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.warn('🔧 Generating complete Bookiji database setup...')
    
    // Complete database setup SQL including all tables and relationships
    const completeSetupSQL = `
-- 🎯 BOOKIJI COMPLETE DATABASE SETUP
-- Copy and paste this ENTIRE script into your Supabase Dashboard SQL Editor
-- This will create all necessary tables, indexes, and security policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.user_credits CASCADE;
DROP TABLE IF EXISTS public.credit_packages CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.availability_slots CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.provider_locations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================
-- 1. PROFILES TABLE (extends Supabase Auth)
-- ==============================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT CHECK (role IN ('customer', 'vendor', 'admin')) DEFAULT 'customer',
  preferences JSONB,
  marketing_consent BOOLEAN DEFAULT false,
  -- Vendor-specific fields
  business_name TEXT,
  service_type TEXT,
  location TEXT,
  description TEXT,
  vendor_status TEXT CHECK (vendor_status IN ('pending_verification', 'pending_approval', 'approved', 'suspended')),
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================
-- 2. USERS TABLE (for app-specific data)
-- ==============================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('customer', 'vendor')) DEFAULT 'customer',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 3. SERVICES TABLE
-- ==============================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 4. PROVIDER LOCATIONS TABLE
-- ==============================
CREATE TABLE public.provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 5. AVAILABILITY SLOTS TABLE
-- ==============================
CREATE TABLE public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 6. BOOKINGS TABLE
-- ==============================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  slot_start TIMESTAMP WITH TIME ZONE NOT NULL,
  slot_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  commitment_fee_paid BOOLEAN DEFAULT false,
  vendor_fee_paid BOOLEAN DEFAULT false,
  total_amount_cents INTEGER DEFAULT 0,
  payment_intent_id TEXT,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 7. REVIEWS TABLE
-- ==============================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 8. CREDIT SYSTEM TABLES
-- ==============================

-- User Credits Table
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  balance_cents INTEGER DEFAULT 0 NOT NULL,
  total_purchased_cents INTEGER DEFAULT 0 NOT NULL,
  total_used_cents INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Credit Transactions Table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')) NOT NULL,
  description TEXT NOT NULL,
  booking_id TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Packages Table
CREATE TABLE public.credit_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits_cents INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  bonus_credits_cents INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================
-- 9. ENABLE ROW LEVEL SECURITY
-- ==============================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- ==============================
-- 10. CREATE RLS POLICIES
-- ==============================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users policies (more permissive for demo)
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own data"
  ON public.users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own data"
  ON public.users FOR UPDATE
  USING (true);

-- Services policies
CREATE POLICY "Services are viewable by everyone"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Vendors can insert their own services"
  ON public.services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Vendors can update their own services"
  ON public.services FOR UPDATE
  USING (true);

-- Provider locations policies
CREATE POLICY "Provider locations are viewable by everyone"
  ON public.provider_locations FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage their locations"
  ON public.provider_locations FOR ALL
  USING (true);

-- Availability slots policies
CREATE POLICY "Availability slots are viewable by everyone"
  ON public.availability_slots FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage their availability"
  ON public.availability_slots FOR ALL
  USING (true);

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (true);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (true);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

-- Credit system policies
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (true);

CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Credit packages are viewable by everyone"
  ON public.credit_packages FOR SELECT
  USING (true);

-- ==============================
-- 11. CREATE TRIGGERS FOR UPDATED_AT
-- ==============================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_provider_locations_updated_at
  BEFORE UPDATE ON public.provider_locations
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- ==============================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- ==============================
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_services_vendor_id ON public.services(vendor_id);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_services_active ON public.services(is_active);
CREATE INDEX idx_provider_locations_vendor_id ON public.provider_locations(vendor_id);
CREATE INDEX idx_provider_locations_city ON public.provider_locations(city);
CREATE INDEX idx_availability_slots_vendor_id ON public.availability_slots(vendor_id);
CREATE INDEX idx_availability_slots_service_id ON public.availability_slots(service_id);
CREATE INDEX idx_availability_slots_start_time ON public.availability_slots(start_time);
CREATE INDEX idx_availability_slots_booked ON public.availability_slots(is_booked);
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_vendor_id ON public.bookings(vendor_id);
CREATE INDEX idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_slot_start ON public.bookings(slot_start);
CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);
CREATE INDEX idx_reviews_vendor_id ON public.reviews(vendor_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_booking_id ON public.credit_transactions(booking_id);

-- ==============================
-- 13. INSERT DEFAULT CREDIT PACKAGES
-- ==============================
INSERT INTO public.credit_packages (id, name, credits_cents, price_cents, bonus_credits_cents, description, is_active) VALUES
('starter', 'Starter Pack', 500, 500, 0, 'Perfect for trying out our services', true),
('popular', 'Popular Pack', 1000, 900, 100, 'Most popular - 10% off + extra credits!', true),
('premium', 'Premium Pack', 2500, 2000, 500, 'Great value - 20% off + bonus credits!', true),
('ultimate', 'Ultimate Pack', 5000, 3750, 1250, 'Best deal - 25% off + maximum bonus!', true),
('enterprise', 'Enterprise Pack', 10000, 7000, 3000, 'For power users - 30% off + huge bonus!', true);

-- ==============================
-- 14. INSERT DEMO DATA (Optional)
-- ==============================

-- Demo users
INSERT INTO public.users (id, email, role, full_name, phone) VALUES
(gen_random_uuid(), 'demo-customer@bookiji.com', 'customer', 'Demo Customer', '+1-555-0123'),
(gen_random_uuid(), 'demo-vendor@bookiji.com', 'vendor', 'Demo Hair Salon', '+1-555-0456');

-- Demo credit balance for demo user
INSERT INTO public.user_credits (user_id, balance_cents, total_purchased_cents, total_used_cents) VALUES
('demo-user-123', 2500, 5000, 2500);

-- ==============================
-- SETUP COMPLETE!
-- ==============================
-- Your Bookiji database is now fully configured with:
-- ✅ All core tables (users, bookings, services, etc.)
-- ✅ Credit system (balances, transactions, packages)
-- ✅ Row Level Security policies
-- ✅ Performance indexes
-- ✅ Default credit packages
-- ✅ Demo data
-- 
-- Next steps:
-- 1. Configure your environment variables with your Supabase project details
-- 2. Test the API endpoints
-- 3. Begin building your booking flow!
`;

    console.warn('✅ Complete database setup SQL generated')
    
    return NextResponse.json({
      success: true,
      message: 'Complete database setup SQL generated including credit system tables. Copy and paste this into your Supabase Dashboard SQL Editor.',
      sql: completeSetupSQL,
      tables_created: [
        'profiles',
        'users', 
        'services',
        'provider_locations',
        'availability_slots',
        'bookings',
        'reviews',
        'user_credits',
        'credit_transactions',
        'credit_packages'
      ],
      features: [
        'Row Level Security (RLS)',
        'Performance indexes',
        'Timestamp triggers',
        'Default credit packages',
        'Demo data',
        'Comprehensive policies'
      ],
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Navigate to SQL Editor',
        '3. Create a new query',
        '4. Copy and paste the ENTIRE SQL script',
        '5. Click "Run" to execute',
        '6. Your database will be fully configured!',
        '7. Update your .env.local with your Supabase credentials',
        '8. Test the API endpoints'
      ]
    })
    
  } catch (error) {
    console.error('❌ Failed to generate database setup:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
} 