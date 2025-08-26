-- Clean Schema Sync Migration
-- This migration applies the KB API schema changes without sample data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create kb_articles table if it doesn't exist
CREATE TABLE IF NOT EXISTS kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    section TEXT NOT NULL,
    url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kb_embeddings table if it doesn't exist
CREATE TABLE IF NOT EXISTS kb_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, chunk_index)
);

-- Create kb_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS kb_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    helpful BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kb_suggestions table if it doesn't exist
CREATE TABLE IF NOT EXISTS kb_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    confidence FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS kb_articles_locale_section_idx ON kb_articles(locale, section);
CREATE INDEX IF NOT EXISTS kb_articles_title_idx ON kb_articles USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS kb_articles_content_idx ON kb_articles USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS kb_embeddings_embedding_idx ON kb_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create unique index for kb_articles
CREATE UNIQUE INDEX IF NOT EXISTS kb_articles_title_locale_ux ON kb_articles (lower(title), locale);

-- Enable RLS
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to kb_articles" ON kb_articles
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert kb_articles" ON kb_articles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update kb_articles" ON kb_articles
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete kb_articles" ON kb_articles
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to kb_embeddings" ON kb_embeddings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert kb_embeddings" ON kb_embeddings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to kb_feedback" ON kb_feedback
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert feedback" ON kb_feedback
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access to kb_suggestions" ON kb_suggestions
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert suggestions" ON kb_suggestions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create functions
CREATE OR REPLACE FUNCTION kb_search(
    query_text TEXT,
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.78,
    match_count INTEGER DEFAULT 5,
    vector_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    section TEXT,
    url TEXT,
    score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.content,
        a.section,
        a.url,
        (vector_weight * (1 - (e.embedding <=> query_embedding))) + 
        ((1 - vector_weight) * (1 - (a.title ILIKE '%' || query_text || '%')::int)) as score
    FROM kb_articles a
    JOIN kb_embeddings e ON a.id = e.article_id
    WHERE e.embedding IS NOT NULL
    AND (e.embedding <=> query_embedding) < (1 - match_threshold)
    ORDER BY score DESC
    LIMIT match_count;
END;
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kb_articles_updated_at 
    BEFORE UPDATE ON kb_articles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT ON kb_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON kb_articles TO authenticated;
GRANT SELECT ON kb_embeddings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON kb_embeddings TO authenticated;
GRANT SELECT ON kb_feedback TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON kb_feedback TO authenticated;
GRANT SELECT ON kb_suggestions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON kb_suggestions TO authenticated;
