create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  sender_id uuid not null,
  sender_type text check (sender_type in ('customer','provider')) not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.booking_messages enable row level security;

drop policy if exists "booking_messages_access" on public.booking_messages;
create policy "booking_messages_access" on public.booking_messages
  using (
    exists (
      select 1 from bookings b
      where b.id = booking_messages.booking_id
        and (b.customer_id = auth.uid() or b.vendor_id = auth.uid())
    ) or auth.role() = 'service_role'
  )
  with check (
    exists (
      select 1 from bookings b
      where b.id = booking_messages.booking_id
        and (b.customer_id = auth.uid() or b.vendor_id = auth.uid())
    ) or auth.role() = 'service_role'
  );
