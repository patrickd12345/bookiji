-- Add roles array to profiles for multi-role support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}'::text[];
