-- KB Article Chunking & Vector Embeddings
-- This enables semantic search across article content

-- Article chunks for better semantic search
create table if not exists kb_article_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references kb_articles(id) on delete cascade not null,
  ord int not null,          -- chunk order within article
  text text not null,        -- chunk content
  created_at timestamptz default now(),
  
  -- Ensure unique ordering per article
  unique(article_id, ord)
);

-- Vector embeddings for semantic similarity
create extension if not exists vector;

create table if not exists kb_embeddings (
  chunk_id uuid primary key references kb_article_chunks(id) on delete cascade,
  embedding vector(1536) not null,     -- OpenAI embedding dimension
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index on kb_article_chunks (article_id, ord);
create index on kb_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Updated_at trigger for embeddings
create or replace function update_embeddings_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_kb_embeddings_updated_at 
    before update on kb_embeddings 
    for each row 
    execute function update_embeddings_updated_at();

-- Enhanced search function with chunking support
create or replace function kb_search(
  q_embedding vector(1536),
  k int default 10,
  in_locale text default null,
  in_section text default null
)
returns table (
  chunk_id uuid, 
  article_id uuid, 
  title text, 
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

-- Hybrid search combining vector + keyword (optional enhancement)
create or replace function kb_hybrid_search(
  q_embedding vector(1536),
  q_text text,
  k int default 10,
  in_locale text default null,
  in_section text default null,
  vector_weight float default 0.7
)
returns table (
  chunk_id uuid, 
  article_id uuid, 
  title text, 
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
    substr(c.text, 1, 240) as snippet,
    (vector_weight * (1 - (e.embedding <=> q_embedding))) + 
    ((1 - vector_weight) * (1 - (c.text ILIKE '%' || q_text || '%')::int)) as score,
    a.section,
    a.locale
  from kb_embeddings e
  join kb_article_chunks c on c.id = e.chunk_id
  join kb_articles a on a.id = c.article_id
  where (in_locale is null or a.locale = in_locale)
    and (in_section is null or a.section = in_section)
  order by score desc
  limit k;
$$;

-- RLS policies
alter table kb_article_chunks enable row level security;
alter table kb_embeddings enable row level security;

-- Allow public read access to chunks and embeddings
create policy "Allow public read access to chunks" on kb_article_chunks
    for select using (true);

create policy "Allow public read access to embeddings" on kb_embeddings
    for select using (true);

-- Only allow authenticated users to manage chunks and embeddings
create policy "Allow authenticated users to manage chunks" on kb_article_chunks
    for all using (auth.role() = 'authenticated');

create policy "Allow authenticated users to manage embeddings" on kb_embeddings
    for all using (auth.role() = 'authenticated');

-- Grant permissions
grant select on kb_article_chunks to anon, authenticated;
grant all on kb_article_chunks to authenticated;
grant select on kb_embeddings to anon, authenticated;
grant all on kb_embeddings to authenticated;
