-- Super fix for support system - drop and recreate everything correctly
-- =================================================================

-- 1. Drop all support system tables and functions to start fresh
-- =============================================================

drop function if exists public.match_kb(vector, int, float);
drop function if exists public.match_kb(vector(384), int, float);
drop function if exists public.match_kb(vector(768), int, float);
drop function if exists public.match_kb(vector(1536), int, float);

drop index if exists kb_chunks_vector_idx;
drop index if exists kb_chunks_article_idx;
drop table if exists public.kb_chunks cascade;
drop table if exists public.kb_articles cascade;

drop table if exists public.support_messages cascade;
drop table if exists public.support_conversations cascade;
drop table if exists public.support_tickets cascade;

drop table if exists public.kb_suggestions cascade;

-- 2. Recreate kb_articles table with correct schema
-- ================================================

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Recreate kb_chunks table with correct 768 dimensions
-- =====================================================

create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.kb_articles(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(768) not null
);

-- Create proper indexes
create index kb_chunks_article_idx on public.kb_chunks(article_id);
create index kb_chunks_vector_idx on public.kb_chunks 
  using ivfflat (embedding vector_cosine_ops) with (lists=100);

-- 4. Recreate the match_kb function for 768 dimensions
-- ==================================================

create or replace function public.match_kb(
  query_embedding vector(768),
  match_count int = 6,
  min_sim float = 0.60
) returns table (
  article_id uuid,
  chunk_id uuid,
  chunk_index int,
  content text,
  similarity float
) language sql stable as $$
  select c.article_id,
         c.id as chunk_id,
         c.chunk_index,
         c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.kb_chunks c
  where 1 - (c.embedding <=> query_embedding) >= min_sim
  order by c.embedding <=> query_embedding asc
  limit match_count;
$$;

-- 5. Recreate support_tickets table with correct schema
-- ===================================================

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  subject text not null,
  body text not null,
  intent text not null default 'other',
  priority text not null default 'normal',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Recreate support_conversations table
-- =====================================

create table public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 7. Recreate support_messages table
-- =================================

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'agent')),
  content text not null,
  created_at timestamptz not null default now()
);

-- 8. Recreate kb_suggestions table
-- ===============================

create table public.kb_suggestions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'duplicate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Create proper indexes
-- ========================

create index support_tickets_status_idx on public.support_tickets(status);
create index support_tickets_intent_idx on public.support_tickets(intent);
create index support_tickets_user_idx on public.support_tickets(user_id);
create index support_tickets_email_idx on public.support_tickets(email);
create index support_tickets_created_idx on public.support_tickets(created_at);

create index support_conversations_ticket_idx on public.support_conversations(ticket_id);
create index support_messages_conversation_idx on public.support_messages(conversation_id);
create index support_messages_created_idx on public.support_messages(created_at);

create index kb_suggestions_status_idx on public.kb_suggestions(status);
create index kb_suggestions_created_idx on public.kb_suggestions(created_at);

-- 10. Enable RLS and create policies
-- ==================================

alter table public.kb_articles enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.kb_suggestions enable row level security;

-- KB articles: public read access
create policy "kb_articles_public_read" on public.kb_articles
  for select using (true);

-- KB chunks: public read access
create policy "kb_chunks_public_read" on public.kb_chunks
  for select using (true);

-- Support tickets: users can see their own, agents can see all
create policy "support_tickets_user_access" on public.support_tickets
  for select using (
    auth.uid() = user_id or 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role in ('admin', 'support_agent')
    )
  );

create policy "support_tickets_insert" on public.support_tickets
  for insert with check (true);

create policy "support_tickets_update" on public.support_tickets
  for update using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role in ('admin', 'support_agent')
    )
  );

-- Support conversations: users can see their own, agents can see all
create policy "support_conversations_user_access" on public.support_conversations
  for select using (
    exists (
      select 1 from public.support_tickets t 
      where t.id = ticket_id and t.user_id = auth.uid()
    ) or 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role in ('admin', 'support_agent')
    )
  );

create policy "support_conversations_insert" on public.support_conversations
  for insert with check (true);

-- Support messages: users can see their own, agents can see all
create policy "support_messages_user_access" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_conversations c
      join public.support_tickets t on t.id = c.ticket_id
      where c.id = conversation_id and t.user_id = auth.uid()
    ) or 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role in ('admin', 'support_agent')
    )
  );

create policy "support_messages_insert" on public.support_messages
  for insert with check (true);

-- KB suggestions: agents can see all
create policy "kb_suggestions_agent_access" on public.kb_suggestions
  for all using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role in ('admin', 'support_agent')
    )
  );

-- 11. Grant permissions
-- =====================

grant usage on schema public to authenticated;
grant all on public.kb_articles to authenticated;
grant all on public.kb_chunks to authenticated;
grant all on public.support_tickets to authenticated;
grant all on public.support_conversations to authenticated;
grant all on public.support_messages to authenticated;
grant all on public.kb_suggestions to authenticated;

grant usage on all sequences in schema public to authenticated;
