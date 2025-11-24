-- Push Subscriptions Table for Web Push Notifications 2.0

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table push_subscriptions enable row level security;

-- Policies
create policy "Users can view own subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_push_subscriptions_user_id on push_subscriptions(user_id);
create index idx_push_subscriptions_endpoint on push_subscriptions(endpoint);

-- Notification Batching Queue
create table if not exists notification_batch_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  batch_id text not null,
  notification_data jsonb not null,
  priority text check (priority in ('low', 'normal', 'high', 'urgent')) default 'normal',
  expires_at timestamptz not null,
  processed boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table notification_batch_queue enable row level security;

-- Policies
create policy "Users can view own queued notifications"
  on notification_batch_queue for select
  using (auth.uid() = user_id);

-- Indexes for batching
create index idx_notification_batch_queue_user_id on notification_batch_queue(user_id);
create index idx_notification_batch_queue_batch_id on notification_batch_queue(batch_id);
create index idx_notification_batch_queue_expires_at on notification_batch_queue(expires_at);
create index idx_notification_batch_queue_processed on notification_batch_queue(processed) where processed = false;

