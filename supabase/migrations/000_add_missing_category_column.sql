-- This migration is now just a safety check since we know the column exists
DO $$
BEGIN
    -- Only run the rest if the services table already exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'services'
    ) THEN
        -- Add category column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name   = 'services' 
              AND column_name  = 'category'
        ) THEN
            ALTER TABLE public.services ADD COLUMN category TEXT;
            UPDATE public.services SET category = 'general' WHERE category IS NULL;
            ALTER TABLE public.services ALTER COLUMN category SET NOT NULL;
        END IF;

        -- Create index if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename  = 'services'
              AND indexname  = 'idx_services_category'
        ) THEN
            CREATE INDEX idx_services_category ON public.services(category);
        END IF;
    END IF;
END $$; 