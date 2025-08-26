-- Enable pgvector extension
create extension if not exists vector;

create table if not exists public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  locale text not null default 'en',
  section text not null default 'faq',
  url text,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.kb_articles(id) on delete cascade,
  chunk_index int not null,
  content text not null
);

create index if not exists kb_chunks_article_idx on public.kb_chunks(article_id);

-- Add constraints for kb_articles
alter table public.kb_articles 
add constraint kb_articles_locale_check check (locale in ('en', 'fr'));

alter table public.kb_articles 
add constraint kb_articles_section_check check (section in ('faq', 'vendor', 'policy', 'troubleshooting'));

-- Create indexes for performance
create index if not exists idx_kb_articles_locale on public.kb_articles(locale);
create index if not exists idx_kb_articles_section on public.kb_articles(section);
create index if not exists idx_kb_articles_created_at on public.kb_articles(created_at);
create index if not exists idx_kb_articles_embedding on public.kb_articles using ivfflat (embedding vector_cosine_ops) with (lists=100);

-- Create unique index for title per locale
create unique index if not exists kb_articles_title_locale_ux 
on public.kb_articles (lower(title), locale);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_kb_articles_updated_at 
    before update on kb_articles 
    for each row 
    execute function update_updated_at_column();

-- Enable RLS
alter table kb_articles enable row level security;

-- Create RLS policies
create policy "Allow public read access to KB articles" on kb_articles
    for select using (true);

create policy "Allow authenticated users to manage KB articles" on kb_articles
    for all using (auth.role() = 'authenticated');

-- Grant necessary permissions
grant select on kb_articles to anon, authenticated;
grant insert, update, delete on kb_articles to authenticated;
