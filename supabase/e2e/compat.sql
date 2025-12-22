-- E2E-only schema compatibility shims (LOCAL ONLY)
-- Applied by `pnpm supabase:start` after `supabase db reset`.
-- Do not add this to `supabase/migrations` (production migration history must remain canonical).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('customer', 'vendor', 'admin')) DEFAULT 'customer',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  slot_start timestamptz NOT NULL,
  slot_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_amount_cents integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal notification tables for idempotency + delivery tracking
CREATE TABLE IF NOT EXISTS public.notification_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  intent_type text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high', 'normal', 'low')),
  allowed_channels text[] NOT NULL,
  payload_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.notification_intents(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_unique
  ON public.notification_deliveries(intent_id, channel);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users, public.services, public.availability_slots TO anon, authenticated;

GRANT ALL PRIVILEGES ON public.users,
  public.services,
  public.availability_slots,
  public.bookings,
  public.notification_intents,
  public.notification_deliveries
TO service_role;
