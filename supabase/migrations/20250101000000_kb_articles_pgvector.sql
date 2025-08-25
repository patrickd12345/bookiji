-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create KB articles table with vector support
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'fr')),
    section TEXT NOT NULL CHECK (section IN ('faq', 'vendor', 'policy', 'troubleshooting')),
    url TEXT,
    embedding vector(1536), -- OpenAI embedding dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_kb_articles_locale ON kb_articles(locale);
CREATE INDEX idx_kb_articles_section ON kb_articles(section);
CREATE INDEX idx_kb_articles_created_at ON kb_articles(created_at);
CREATE INDEX idx_kb_articles_embedding ON kb_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kb_articles_updated_at 
    BEFORE UPDATE ON kb_articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate embeddings (placeholder - you'll need to implement this with your embedding service)
CREATE OR REPLACE FUNCTION get_query_embedding(query_text TEXT)
RETURNS vector(1536) AS $$
BEGIN
    -- This is a placeholder - you'll need to:
    -- 1. Call your embedding service (OpenAI, Ollama, etc.)
    -- 2. Return the embedding vector
    -- For now, returning a zero vector as placeholder
    RETURN '0'::vector(1536);
END;
$$ LANGUAGE plpgsql;

-- Function to find similar documents using vector similarity
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    target_locale TEXT DEFAULT NULL,
    target_section TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    section TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb_articles.id,
        kb_articles.title,
        kb_articles.content,
        kb_articles.section,
        1 - (kb_articles.embedding <=> query_embedding) as similarity
    FROM kb_articles
    WHERE 1 - (kb_articles.embedding <=> query_embedding) > match_threshold
      AND (target_locale IS NULL OR kb_articles.locale = target_locale)
      AND (target_section IS NULL OR kb_articles.section = target_section)
    ORDER BY kb_articles.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Insert some sample data for testing
INSERT INTO kb_articles (title, content, locale, section, url) VALUES
(
    'About the $1 Hold',
    'We place a temporary $1 authorization to verify your payment method. It is not a charge and disappears automatically within 1-3 business days. This is a standard practice to ensure your card is valid and has sufficient funds.',
    'en',
    'faq',
    'https://bookiji.com/faq#holds'
),
(
    'Vendor Payouts',
    'Payouts are initiated after bookings are confirmed and completed. We process payments on a weekly schedule, typically every Tuesday. Vendors can set their preferred payout method in their dashboard settings.',
    'en',
    'vendor',
    'https://bookiji.com/vendors#payouts'
),
(
    'Cancellation Policy',
    'Bookings can be cancelled up to 24 hours before the scheduled time for a full refund. Cancellations within 24 hours may incur a cancellation fee. No-shows are charged the full booking amount.',
    'en',
    'policy',
    'https://bookiji.com/policy#cancellation'
),
(
    'Payment Issues',
    'If you experience payment issues, please check that your card has sufficient funds and is not expired. We accept Visa, Mastercard, American Express, and Discover. Contact support if problems persist.',
    'en',
    'troubleshooting',
    'https://bookiji.com/help#payment'
);

-- RLS policies for security
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to KB articles
CREATE POLICY "Allow public read access to KB articles" ON kb_articles
    FOR SELECT USING (true);

-- Only allow authenticated users to create/update/delete (for admin purposes)
CREATE POLICY "Allow authenticated users to manage KB articles" ON kb_articles
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON kb_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON kb_articles TO authenticated;
