-- Add missing kb_suggestions columns used by the app
alter table public.kb_suggestions add column if not exists ticket_id uuid;
alter table public.kb_suggestions add column if not exists intent text;
alter table public.kb_suggestions add column if not exists similarity_to_best float8;
alter table public.kb_suggestions add column if not exists target_article_id uuid;
alter table public.kb_suggestions add column if not exists q_embedding vector(768);
alter table public.kb_suggestions add column if not exists a_embedding vector(768);

-- Safe FK creation (idempotent)
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
