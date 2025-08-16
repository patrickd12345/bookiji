-- Create table to ensure Stripe webhook idempotency persistence
-- Stores processed event IDs to avoid double-processing

create table if not exists public.processed_webhook_events (
	 event_id text primary key,
	 created_at timestamptz not null default now()
);

comment on table public.processed_webhook_events is 'Stripe/webhook idempotency log of processed event IDs';
comment on column public.processed_webhook_events.event_id is 'Stripe event id (or external webhook event id)';

-- Optional retention policy can be handled by a scheduled job; keeping all for audit by default

-- RLS is not required; server-only table. If desired, enable and deny all by default.
-- alter table public.processed_webhook_events enable row level security;
-- create policy "deny all" on public.processed_webhook_events for all using (false);


