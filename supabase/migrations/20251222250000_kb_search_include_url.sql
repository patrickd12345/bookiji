-- Update kb_search to include URL for citations
-- Drop and recreate because we're changing the return type
drop function if exists kb_search(vector, int, text, text);

create function kb_search(
  q_embedding vector(1536),
  k int default 10,
  in_locale text default null,
  in_section text default null
)
returns table (
  chunk_id uuid, 
  article_id uuid, 
  title text,
  url text,
  snippet text, 
  score float,
  section text,
  locale text
)
language sql stable as $$
  select
    c.id as chunk_id,
    a.id as article_id,
    a.title,
    a.url,
    substr(c.text, 1, 240) as snippet,
    1 - (e.embedding <=> q_embedding) as score,  -- cosine similarity
    a.section,
    a.locale
  from kb_embeddings e
  join kb_article_chunks c on c.id = e.chunk_id
  join kb_articles a on a.id = c.article_id
  where (in_locale is null or a.locale = in_locale)
    and (in_section is null or a.section = in_section)
  order by e.embedding <=> q_embedding
  limit k;
$$;


