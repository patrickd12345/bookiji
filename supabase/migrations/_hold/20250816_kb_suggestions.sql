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
