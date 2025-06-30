-- Create a generic key-value settings table
-- This table is intended for small, cross-cutting configuration items (feature flags,
-- static microsite copy, etc.) so we don't create a dedicated table for only one or
-- two rows of data.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Example seed rows -----------------------------------------------------------
-- INSERT INTO public.app_settings (key, value, description)
-- VALUES
--   ('homepage_hero_copy', jsonb_build_object('en', 'Book instantly. Anywhere.', 'es', 'Reserva al instante. En cualquier lugar.'), 'Localized landing hero headline'),
--   ('beta_waitlist_open', 'true', 'Feature flag to open/close beta signup'); 