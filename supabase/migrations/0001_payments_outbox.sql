-- payments_outbox + dlq for idempotent Stripe handling

create extension if not exists "pgcrypto";

create table if not exists payments_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  event_type text not null, -- e.g., 'stripe.hold_created', 'stripe.payment_intent.succeeded'
  idempotency_key text not null unique,
  state text not null check (state in ('queued','in_flight','committed','failed')) default 'queued',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index if not exists idx_payments_outbox_state on payments_outbox(state);
create index if not exists idx_payments_outbox_booking on payments_outbox(booking_id);

create table if not exists payments_dlq (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references payments_outbox(id) on delete cascade,
  error text not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
