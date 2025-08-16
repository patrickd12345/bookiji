-- Comprehensive fix for support system issues
-- =============================================

-- 1. Fix embedding dimensions to match Ollama output (768 dimensions)
-- =============================================

-- Update kb_chunks table to use 768-dimensional vectors
alter table public.kb_chunks 
  alter column embedding type vector(768);

-- Update the match_kb function to accept 768-dimensional vectors
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

-- Recreate the vector index for the new dimensions
drop index if exists kb_chunks_vector_idx;
create index if not exists kb_chunks_vector_idx on public.kb_chunks 
  using ivfflat (embedding vector_cosine_ops) with (lists=250);

-- 2. Ensure support_tickets table has correct schema
-- =============================================

-- Add missing columns if they don't exist
alter table public.support_tickets
  add column if not exists user_id uuid null,
  add column if not exists email text null,
  add column if not exists subject text null,
  add column if not exists body text null,
  add column if not exists intent text null default 'other',
  add column if not exists priority text null default 'normal',
  add column if not exists status text null default 'open',
  add column if not exists created_at timestamptz null default now(),
  add column if not exists updated_at timestamptz null default now();

-- Update existing rows to have required values
update public.support_tickets 
set subject = coalesce(subject, 'Support Request'),
    body = coalesce(body, 'No message provided'),
    intent = coalesce(intent, 'other'),
    priority = coalesce(priority, 'normal'),
    status = coalesce(status, 'open'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where subject is null or body is null;

-- Make required columns not null
alter table public.support_tickets
  alter column subject set not null,
  alter column body set not null,
  alter column intent set not null,
  alter column priority set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

-- 3. Fix any missing indexes
-- =============================================

create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_intent_idx on public.support_tickets(intent);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id);
create index if not exists support_tickets_email_idx on public.support_tickets(email);

-- 4. Ensure RLS policies are correct
-- =============================================

-- Drop conflicting policies
drop policy if exists "support_tickets_user_access" on public.support_tickets;
drop policy if exists "support_tickets_agent_access" on public.support_tickets;

-- Create correct policies
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
