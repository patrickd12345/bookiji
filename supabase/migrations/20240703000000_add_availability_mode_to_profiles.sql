-- Add an availability mode to the profiles table
ALTER TABLE public.profiles
ADD COLUMN availability_mode TEXT NOT NULL DEFAULT 'subtractive';

-- Add a check constraint to ensure only valid values are used
ALTER TABLE public.profiles
ADD CONSTRAINT check_availability_mode
CHECK (availability_mode IN ('subtractive', 'additive'));

-- We should also add a setting to determine which calendar source is the single source of truth.
ALTER TABLE public.profiles
ADD COLUMN calendar_source TEXT NOT NULL DEFAULT 'google';

-- Add a check constraint for the calendar source as well
ALTER TABLE public.profiles
ADD CONSTRAINT check_calendar_source
CHECK (calendar_source IN ('google', 'outlook', 'bookiji_native')); 