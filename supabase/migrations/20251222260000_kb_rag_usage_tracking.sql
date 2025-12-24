-- Simple table to track RAG API usage for monitoring
create table if not exists public.kb_rag_usage (
  id uuid primary key default gen_random_uuid(),
  used_at timestamptz default now() not null,
  question_length int,
  chunks_retrieved int,
  answer_length int
);

-- Index for fast queries
create index if not exists idx_kb_rag_usage_used_at on public.kb_rag_usage(used_at desc);

-- RLS: Allow public read for monitoring, but only service role can write
alter table public.kb_rag_usage enable row level security;

create policy "Allow public read access to RAG usage stats" on public.kb_rag_usage
  for select using (true);

-- Service role can insert (via API)
grant select on public.kb_rag_usage to anon, authenticated;
grant insert on public.kb_rag_usage to authenticated;












