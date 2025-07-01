-- Capture unanswered support queries from FAQ or AI chat
CREATE TABLE IF NOT EXISTS support_unanswered_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255),
  source VARCHAR(20) NOT NULL DEFAULT 'faq', -- faq | ai_chat
  query_text TEXT NOT NULL,
  query_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  article_id UUID REFERENCES knowledge_base(id)
);

-- RLS: anyone can insert their own unanswered question (anon allowed)
ALTER TABLE support_unanswered_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unanswered_insert" ON support_unanswered_questions;
CREATE POLICY "unanswered_insert" ON support_unanswered_questions
  FOR INSERT WITH CHECK (true);

-- Admin/agent can select/update
DROP POLICY IF EXISTS "unanswered_read_update" ON support_unanswered_questions;
CREATE POLICY "unanswered_read_update" ON support_unanswered_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ); 