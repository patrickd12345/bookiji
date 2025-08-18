-- Persisted processed Stripe events (idempotency)
create table if not exists public.payments_processed_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

-- Helpful index to accelerate TTL deletes
create index if not exists payments_processed_events_processed_at_idx
  on public.payments_processed_events(processed_at);

alter table public.payments_processed_events enable row level security;
drop policy if exists "server-only-processed-events" on public.payments_processed_events;
create policy "server-only-processed-events" on public.payments_processed_events
for all using (false) with check (false);


