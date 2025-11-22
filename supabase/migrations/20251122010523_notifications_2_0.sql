-- Notifications 2.0 Schema

-- 1. Notification Preferences
create table if not exists notification_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  email_enabled boolean default true,
  sms_enabled boolean default false,
  push_enabled boolean default false,
  
  -- Granular controls
  marketing_emails boolean default true,
  transactional_emails boolean default true,
  booking_updates boolean default true,
  reminders boolean default true,
  
  phone_number text, -- Verified phone number for SMS
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table notification_preferences enable row level security;

-- Policies
create policy "Users can view own preferences"
  on notification_preferences for select
  using (auth.uid() = user_id);

create policy "Users can update own preferences"
  on notification_preferences for update
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on notification_preferences for insert
  with check (auth.uid() = user_id);

-- 2. Notification Logs (History)
create table if not exists notification_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  recipient text not null,
  type text not null check (type in ('email', 'sms', 'push')),
  template text not null,
  status text not null check (status in ('sent', 'failed', 'queued', 'delivered')),
  provider_response jsonb,
  metadata jsonb, -- Extra data like booking_id
  error_message text,
  
  created_at timestamptz default now()
);

-- Enable RLS
alter table notification_logs enable row level security;

-- Policies
create policy "Users can view own notification history"
  on notification_logs for select
  using (auth.uid() = user_id);

-- Admin can view all (assuming admin role logic exists elsewhere, skipping for now or adding if simple)
-- create policy "Admins can view all logs" on notification_logs ...

-- Indexes for performance
create index idx_notification_logs_user_id on notification_logs(user_id);
create index idx_notification_logs_created_at on notification_logs(created_at desc);

