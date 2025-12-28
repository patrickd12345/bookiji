-- Restore KB Embeddings and Chunks
-- Required because 20250819190000_complete_database_schema.sql wiped them but didn't recreate them.
-- Restores schema from 20250102000000_kb_chunking.sql

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
create index if not exists kb_article_chunks_article_id_ord_idx on kb_article_chunks (article_id, ord);
create index if not exists kb_embeddings_embedding_idx on kb_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Updated_at trigger for embeddings
create or replace function update_embeddings_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_kb_embeddings_updated_at on kb_embeddings;
create trigger update_kb_embeddings_updated_at 
    before update on kb_embeddings 
    for each row 
    execute function update_embeddings_updated_at();

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

