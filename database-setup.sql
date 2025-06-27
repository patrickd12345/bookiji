-- 🎯 Bookiji Complete Database Setup
-- Copy and paste this entire file into your Supabase Dashboard SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (for Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT CHECK (role IN ('customer', 'vendor', 'admin')),
  preferences JSONB,
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create users table (extends profiles)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('customer', 'vendor')) DEFAULT 'customer',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
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

-- Create availability slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
  commitment_fee_paid BOOLEAN DEFAULT false,
  vendor_fee_paid BOOLEAN DEFAULT false,
  total_amount_cents INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  no_show_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create provider locations table
CREATE TABLE IF NOT EXISTS public.provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  service_radius_km INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💰 Credit System Tables

-- Create user credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  balance_cents INTEGER DEFAULT 0 NOT NULL,
  total_purchased_cents INTEGER DEFAULT 0 NOT NULL,
  total_used_cents INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create credit transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'bonus')) NOT NULL,
  description TEXT NOT NULL,
  booking_id TEXT,
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit packages table
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits_cents INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  bonus_credits_cents INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create RLS policies for credit tables
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;
CREATE POLICY "Users can insert their own credits"
  ON public.user_credits FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Credit packages are viewable by everyone" ON public.credit_packages;
CREATE POLICY "Credit packages are viewable by everyone"
  ON public.credit_packages FOR SELECT
  USING (true);

-- Create trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- Create trigger for user_credits
DROP TRIGGER IF EXISTS handle_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER handle_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- Insert default credit packages
INSERT INTO public.credit_packages (id, name, credits_cents, price_cents, bonus_credits_cents, description, is_active) VALUES
  ('starter', 'Starter Pack', 500, 500, 0, 'Perfect for trying out our services', true),
  ('popular', 'Popular Pack', 1000, 900, 200, 'Most popular - 10% off + 20% bonus credits!', true),
  ('value', 'Value Pack', 2500, 2000, 750, 'Great value - 20% off + 30% bonus credits!', true),
  ('premium', 'Premium Pack', 5000, 3750, 2000, 'Best deal - 25% off + 40% bonus credits!', true),
  ('ultimate', 'Ultimate Pack', 10000, 7000, 5000, 'Maximum savings - 30% off + 50% bonus credits!', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_booking_id ON public.credit_transactions(booking_id);

-- ✅ Database setup complete!
-- Now test with: curl http://localhost:3000/api/test-database 