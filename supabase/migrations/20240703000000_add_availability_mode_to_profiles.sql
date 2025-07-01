-- Add an availability mode to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS availability_mode TEXT;

-- Ensure default
ALTER TABLE public.profiles ALTER COLUMN availability_mode SET DEFAULT 'subtractive';

-- Add or replace constraint
DO $$BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_availability_mode;
  ALTER TABLE public.profiles
  ADD CONSTRAINT check_availability_mode
  CHECK (availability_mode IN ('subtractive', 'additive'));
EXCEPTION WHEN others THEN NULL; END$$;

-- We should also add a setting to determine which calendar source is the single source of truth.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS calendar_source TEXT;
ALTER TABLE public.profiles ALTER COLUMN calendar_source SET DEFAULT 'google';

DO $$BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_calendar_source;
  ALTER TABLE public.profiles
  ADD CONSTRAINT check_calendar_source
  CHECK (calendar_source IN ('google', 'outlook', 'bookiji_native'));
EXCEPTION WHEN others THEN NULL; END$$; 