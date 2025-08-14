-- Track Stripe idempotency keys for payments/refunds
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
