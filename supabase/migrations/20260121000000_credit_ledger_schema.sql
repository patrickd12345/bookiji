-- Migration: Credit Ledger Schema
-- Creates an append-only credit ledger for reconciliation
BEGIN;

-- Create credit_ledger_entries table (append-only ledger)
CREATE TABLE IF NOT EXISTS public.credit_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('customer','provider')),
  owner_id UUID NOT NULL,
  booking_id UUID,
  credit_intent_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL, -- cents, can be negative
  currency TEXT NOT NULL DEFAULT 'USD',
  reason_code TEXT NOT NULL, -- earned | redeemed | expired | forfeited | refunded
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  CONSTRAINT credit_intent_unique UNIQUE (credit_intent_id),
  CONSTRAINT expires_after_created CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_credit_ledger_owner ON public.credit_ledger_entries (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_booking ON public.credit_ledger_entries (booking_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_expires_at ON public.credit_ledger_entries (expires_at);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_intent ON public.credit_ledger_entries (credit_intent_id);

-- Append-only enforcement: prevent UPDATE and DELETE on ledger table
CREATE OR REPLACE FUNCTION public.prevent_credit_ledger_modifications()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'credit_ledger_entries is append-only: % not allowed', TG_OP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_credit_ledger_mods ON public.credit_ledger_entries;
CREATE TRIGGER trg_prevent_credit_ledger_mods
  BEFORE UPDATE OR DELETE ON public.credit_ledger_entries
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_credit_ledger_modifications();

COMMIT;

