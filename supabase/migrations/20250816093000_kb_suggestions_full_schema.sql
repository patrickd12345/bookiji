-- Bring kb_suggestions to full schema expected by application
-- Safe alters with IF NOT EXISTS to be idempotent locally

-- Ensure table exists
create table if not exists public.kb_suggestions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','duplicate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns
alter table public.kb_suggestions add column if not exists ticket_id uuid;
alter table public.kb_suggestions add column if not exists intent text;
alter table public.kb_suggestions add column if not exists similarity_to_best float8;
alter table public.kb_suggestions add column if not exists target_article_id uuid;
alter table public.kb_suggestions add column if not exists q_embedding vector(768);
alter table public.kb_suggestions add column if not exists a_embedding vector(768);

-- Safe FK creation compatible with Postgres (no IF NOT EXISTS on add constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_suggestions_target_article_id_fkey'
  ) THEN
    ALTER TABLE public.kb_suggestions
      ADD CONSTRAINT kb_suggestions_target_article_id_fkey
      FOREIGN KEY (target_article_id) REFERENCES public.kb_articles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful indexes
create index if not exists kb_suggestions_ticket_idx on public.kb_suggestions(ticket_id);
create index if not exists kb_suggestions_status_idx on public.kb_suggestions(status);
create index if not exists kb_suggestions_created_idx on public.kb_suggestions(created_at);

-- RLS remains enabled as set previously (if any)
