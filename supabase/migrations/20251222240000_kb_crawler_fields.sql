-- Add crawler fields to kb_articles
ALTER TABLE public.kb_articles 
ADD COLUMN IF NOT EXISTS content_hash text,
ADD COLUMN IF NOT EXISTS last_crawled_at timestamptz;

-- Add unique constraint on url for idempotent upserts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.kb_articles'::regclass 
    AND conname = 'kb_articles_url_key'
  ) THEN
    ALTER TABLE public.kb_articles ADD CONSTRAINT kb_articles_url_key UNIQUE (url);
  END IF;
END $$;

-- Add index on url for faster lookups during crawl
CREATE INDEX IF NOT EXISTS idx_kb_articles_url ON public.kb_articles(url);

