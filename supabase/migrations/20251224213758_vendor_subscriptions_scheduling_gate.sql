-- Vendor Subscriptions
-- Purpose: Scheduling-only SaaS access
-- Stripe webhooks are the sole writer

-- Handle potential conflict with previous migration if applied
drop table if exists vendor_subscriptions cascade;

create table vendor_subscriptions (
  id uuid primary key default gen_random_uuid(),

  vendor_id uuid not null,

  stripe_customer_id text not null,
  stripe_subscription_id text not null,

  status text not null check (
    status in ('active', 'past_due', 'canceled', 'incomplete')
  ),

  current_period_start timestamptz not null,
  current_period_end timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vendor_subscriptions_stripe_subscription_uidx
  on vendor_subscriptions (stripe_subscription_id);

create index vendor_subscriptions_vendor_id_idx
  on vendor_subscriptions (vendor_id);

alter table vendor_subscriptions enable row level security;

create policy "Vendor can read own subscription"
on vendor_subscriptions
for select
using (vendor_id = auth.uid());

