-- Add unique index for kb_articles to prevent duplicates during bootstrapping
-- This ensures that (locale, title) combinations are unique

-- Only create index if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kb_articles') THEN
        -- Create unique index if it doesn't exist
        CREATE UNIQUE INDEX IF NOT EXISTS kb_articles_title_locale_ux
        ON kb_articles (lower(title), locale);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON INDEX kb_articles_title_locale_ux IS 'Ensures unique title per locale for KB articles to prevent duplicates during bootstrapping';
