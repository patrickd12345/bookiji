create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  email text null,
  subject text not null,
  body text not null,
  intent text not null default 'other',
  priority text not null default 'normal',
  status text not null default 'open', -- open | waiting | in_progress | resolved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  origin text not null,           -- 'faq' | 'rag' | 'chat'
  resolved_at timestamptz null,
  outcome text null,              -- 'deflected' | 'escalated' | 'resolved'
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  role text not null,             -- 'user' | 'assistant' | 'system' | 'agent'
  text text not null,
  intent text null,
  confidence float8 null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_intent_idx on public.support_tickets(intent);
create index if not exists support_messages_conv_idx on public.support_messages(conversation_id);
