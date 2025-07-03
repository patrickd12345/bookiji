-- Add read_at column to the notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
