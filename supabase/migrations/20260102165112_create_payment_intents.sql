-- Migration: Create PaymentIntent table
-- Links every money-moving operation to a Credit Ledger intent and booking
-- Enforces ledger linkage and prevents double-capture/refund

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('customer','provider')),
  owner_id UUID NOT NULL,
  booking_id UUID,
  credit_intent_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','authorized','captured','refunded','cancelled','failed')),
  external_provider TEXT, -- e.g. 'stripe'
  external_id TEXT, -- provider's payment_intent id
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_payment_intents_idempotency UNIQUE (idempotency_key),
  CONSTRAINT ux_payment_intents_external UNIQUE (external_provider, external_id),
  CONSTRAINT fk_payment_intents_credit_ledger FOREIGN KEY (credit_intent_id) REFERENCES public.credit_ledger_entries(credit_intent_id) ON DELETE RESTRICT
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payment_intents_owner ON public.payment_intents (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_booking ON public.payment_intents (booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_credit_intent ON public.payment_intents (credit_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents (status);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_payment_intent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_payment_intent_updated_at ON public.payment_intents;
CREATE TRIGGER trg_update_payment_intent_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intent_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payment_intents TO authenticated;
GRANT SELECT ON public.payment_intents TO anon;

-- Enable RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment intents" ON public.payment_intents
  FOR SELECT USING (
    (owner_type = 'customer' AND owner_id = auth.uid()) OR
    (owner_type = 'provider' AND owner_id = auth.uid())
  );

CREATE POLICY "Service role can manage all payment intents" ON public.payment_intents
  FOR ALL USING (auth.role() = 'service_role');
