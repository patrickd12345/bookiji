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
  embedding vector(768) not null
);

create index if not exists kb_chunks_article_idx on public.kb_chunks(article_id);
create index if not exists kb_chunks_vector_idx on public.kb_chunks using ivfflat (embedding vector_cosine_ops) with (lists=100);

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
