-- Fix embedding dimensions to match Ollama nomic-embed-text output (768 dimensions)
-- ========================================

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
