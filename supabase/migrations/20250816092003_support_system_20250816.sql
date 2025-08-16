-- Support System Migration - Combined
-- This migration creates the complete support system including:
-- 1. Core support tables (tickets, conversations, messages)
-- 2. Knowledge base tables (articles, chunks with vector search)
-- 3. KB suggestions review queue

-- ========================================
-- 1. CORE SUPPORT TABLES
-- ========================================

-- Ensure pgvector is available for embeddings
create extension if not exists vector;

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
-- Ensure intent column exists for indexing in older schemas
alter table public.support_tickets
  add column if not exists intent text not null default 'other';
create index if not exists support_tickets_intent_idx on public.support_tickets(intent);
-- Ensure conversation_id exists for mixed-schema compatibility
alter table public.support_messages
  add column if not exists conversation_id uuid references public.support_conversations(id) on delete cascade;
create index if not exists support_messages_conv_idx on public.support_messages(conversation_id);

-- ========================================
-- 2. KNOWLEDGE BASE TABLES
-- ========================================

create table if not exists public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null
);

create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.kb_articles(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(384) not null
);

create index if not exists kb_chunks_article_idx on public.kb_chunks(article_id);
create index if not exists kb_chunks_vector_idx on public.kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists=250);

-- Vector similarity search function
create or replace function public.match_kb(
  query_embedding vector(384),
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

-- ========================================
-- 3. KB SUGGESTIONS REVIEW QUEUE
-- ========================================

create table if not exists public.kb_suggestions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  question text not null,
  answer text not null,
  intent text null,
  similarity_to_best float8 not null default 0,
  target_article_id uuid null references public.kb_articles(id) on delete set null,
  status text not null default 'pending',  -- pending | approved | rejected | duplicate
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kb_suggestions
  add column if not exists q_embedding vector(1536),
  add column if not exists a_embedding vector(1536);

create index if not exists kb_suggestions_status_idx on public.kb_suggestions(status);
create index if not exists kb_suggestions_ticket_idx on public.kb_suggestions(ticket_id);

-- ========================================
-- 4. ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on support tables
alter table public.support_tickets enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.kb_articles enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.kb_suggestions enable row level security;

-- Support tickets: users can view their own, agents can view all
drop policy if exists "support_tickets_user_access" on public.support_tickets;
create policy "support_tickets_user_access" on public.support_tickets
  for select using (
    auth.uid() = user_id or 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Support conversations: users can view their own, agents can view all
drop policy if exists "support_conversations_user_access" on public.support_conversations;
create policy "support_conversations_user_access" on public.support_conversations
  for select using (
    auth.uid() = user_id or 
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Support messages: users can view messages from their conversations, agents can view all
drop policy if exists "support_messages_user_access" on public.support_messages;
create policy "support_messages_user_access" on public.support_messages
  for select using (
    exists (
      select 1 from public.support_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- KB articles: public read access
drop policy if exists "kb_articles_public_read" on public.kb_articles;
create policy "kb_articles_public_read" on public.kb_articles
  for select using (true);

-- KB chunks: public read access
drop policy if exists "kb_chunks_public_read" on public.kb_chunks;
create policy "kb_chunks_public_read" on public.kb_chunks
  for select using (true);

-- KB suggestions: only agents can view
drop policy if exists "kb_suggestions_agent_access" on public.kb_suggestions;
create policy "kb_suggestions_agent_access" on public.kb_suggestions
  for select using (
    exists (
      select 1 from public.profiles p 
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ========================================
-- 5. GRANTS
-- ========================================

-- Grant appropriate permissions
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert, update on public.support_conversations to authenticated;
grant select, insert, update on public.support_messages to authenticated;
grant select on public.kb_articles to authenticated;
grant select on public.kb_chunks to authenticated;
grant select, insert, update on public.kb_suggestions to authenticated;

-- Grant usage on sequences
grant usage on all sequences in schema public to authenticated;
