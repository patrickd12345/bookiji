create table if not exists public.kb_suggestions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  intent text null,
  similarity_to_best float8 not null default 0,
  target_article_id uuid null references public.kb_articles(id) on delete set null,
  status text not null default 'pending',  -- pending | approved | rejected | duplicate
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kb_suggestions_status_idx on public.kb_suggestions(status);
