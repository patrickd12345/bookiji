-- Drop existing foreign key constraints that reference vendors table
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_vendor_id_fkey;
ALTER TABLE public.availability_slots DROP CONSTRAINT IF EXISTS availability_slots_vendor_id_fkey;
ALTER TABLE public.provider_locations DROP CONSTRAINT IF EXISTS provider_locations_vendor_id_fkey;

-- Migrate vendors to users table (conditional - table may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendors') THEN
        INSERT INTO public.users (id, email, role, full_name, phone, created_at, updated_at)
        SELECT 
            id,
            email,
            'vendor',
            full_name,
            phone,
            created_at AT TIME ZONE 'UTC',
            updated_at AT TIME ZONE 'UTC'
        FROM public.vendors
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            role = 'vendor',
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            updated_at = EXCLUDED.updated_at;

        -- Now drop the vendors table
        DROP TABLE IF EXISTS public.vendors;
    END IF;
END $$;

-- Fix timestamp inconsistencies
ALTER TABLE public.availability_slots
ALTER COLUMN start_time TYPE timestamp with time zone USING start_time AT TIME ZONE 'UTC',
ALTER COLUMN end_time TYPE timestamp with time zone USING end_time AT TIME ZONE 'UTC',
ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';

ALTER TABLE public.services
ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE public.provider_locations
ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- Add new foreign key constraints pointing to users table
ALTER TABLE public.services
ADD CONSTRAINT services_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.availability_slots
ADD CONSTRAINT availability_slots_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.provider_locations
ADD CONSTRAINT provider_locations_vendor_id_fkey 
    FOREIGN KEY (vendor_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add indices for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_availability_slots_times ON public.availability_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_locations_active ON public.provider_locations(is_active); 