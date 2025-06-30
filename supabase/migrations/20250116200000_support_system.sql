-- 🎧 COMPREHENSIVE SUPPORT SYSTEM MIGRATION
-- 3-Tier Support System: Rule-based, AI-based, and Human

-- =======================
-- SUPPORT CATEGORIES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS support_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- For UI display
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  is_active BOOLEAN DEFAULT true,
  auto_resolve_rules JSONB DEFAULT '[]', -- Rule-based automation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- SUPPORT TICKETS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL, -- Human-readable: SUP-2024-001
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category_id UUID REFERENCES support_categories(id),
  
  -- Ticket Details
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id), -- Support agent
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- AI Processing
  ai_confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  ai_suggested_resolution TEXT,
  ai_processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  customer_satisfaction INTEGER, -- 1-5 rating
  customer_feedback TEXT,
  
  -- Metadata
  tags VARCHAR(50)[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generate ticket numbers automatically
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  ticket_num TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(ticket_number FROM 'SUP-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM support_tickets
  WHERE ticket_number LIKE 'SUP-' || year_part || '-%';
  
  ticket_num := 'SUP-' || year_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION trigger_generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_ticket_number ON support_tickets;
CREATE TRIGGER trigger_auto_ticket_number
  BEFORE INSERT OR UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION trigger_generate_ticket_number();

-- =======================
-- SUPPORT MESSAGES TABLE (Chat History)
-- =======================
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id), -- NULL for system messages
  sender_type VARCHAR(20) NOT NULL, -- 'customer', 'agent', 'ai', 'system'
  
  -- Message Content
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, system_update
  attachments JSONB DEFAULT '[]', -- File references
  
  -- AI Processing
  is_ai_generated BOOLEAN DEFAULT false,
  ai_model VARCHAR(50), -- Which AI model generated this
  ai_confidence NUMERIC(3,2),
  
  -- Message Status
  is_internal BOOLEAN DEFAULT false, -- Internal agent notes
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- FAQ/KNOWLEDGE BASE TABLE
-- =======================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES support_categories(id),
  
  -- SEO and Search
  slug VARCHAR(255) UNIQUE,
  meta_description TEXT,
  keywords VARCHAR(255)[] DEFAULT '{}',
  search_vector tsvector, -- Full-text search
  
  -- Usage Statistics
  view_count INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  
  -- Management
  author_id UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- AI Enhancement
  ai_generated BOOLEAN DEFAULT false,
  ai_last_updated TIMESTAMP WITH TIME ZONE,
  related_tickets_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search ON knowledge_base USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_published ON knowledge_base(is_published);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_knowledge_base_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.content, '') || ' ' ||
    COALESCE(array_to_string(NEW.keywords, ' '), '')
  );
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kb_search ON knowledge_base;
CREATE TRIGGER trigger_update_kb_search
  BEFORE INSERT OR UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_base_search_vector();

-- =======================
-- AI CHAT CONVERSATIONS TABLE
-- =======================
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL, -- For anonymous users
  
  -- Conversation Classification
  intent VARCHAR(100), -- 'booking_help', 'account_issue', 'general_inquiry'
  resolved BOOLEAN DEFAULT false,
  escalated_to_human BOOLEAN DEFAULT false,
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  -- AI Performance Metrics
  ai_confidence_avg NUMERIC(3,2),
  message_count INTEGER DEFAULT 0,
  user_satisfaction INTEGER, -- 1-5 rating after conversation
  
  -- Context
  metadata JSONB DEFAULT '{}', -- User context, preferences
  tags VARCHAR(50)[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- AI CHAT MESSAGES TABLE
-- =======================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
  
  -- Message Details
  sender_type VARCHAR(10) NOT NULL, -- 'user' or 'ai'
  message TEXT NOT NULL,
  message_order INTEGER NOT NULL, -- Order within conversation
  
  -- AI Processing
  ai_model VARCHAR(50), -- Which AI model was used
  ai_confidence NUMERIC(3,2),
  processing_time_ms INTEGER, -- Response time tracking
  
  -- Context and Intent
  detected_intent VARCHAR(100),
  confidence_score NUMERIC(3,2),
  context_used JSONB DEFAULT '{}', -- What context was used for response
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- SUPPORT AUTOMATION RULES
-- =======================
CREATE TABLE IF NOT EXISTS support_automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Rule Configuration
  trigger_conditions JSONB NOT NULL, -- When to trigger
  actions JSONB NOT NULL, -- What actions to take
  priority INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  
  -- Performance Tracking
  times_triggered INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.00,
  last_triggered TIMESTAMP WITH TIME ZONE,
  
  -- Management
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================
-- INDEXES FOR PERFORMANCE
-- =======================

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category_id);

-- Support messages indexes
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender ON support_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- AI chat indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_user_id ON ai_chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_session ON ai_chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation ON ai_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_order ON ai_chat_messages(conversation_id, message_order);

-- =======================
-- ROW LEVEL SECURITY
-- =======================

-- Enable RLS on all support tables
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_automation_rules ENABLE ROW LEVEL SECURITY;

-- Support categories: Public read, admin write
DROP POLICY IF EXISTS "support_categories_public_read" ON support_categories;
CREATE POLICY "support_categories_public_read" ON support_categories
  FOR SELECT USING (is_active = true);

-- Support tickets: Users see their own, agents see assigned, admins see all
DROP POLICY IF EXISTS "support_tickets_user_access" ON support_tickets;
CREATE POLICY "support_tickets_user_access" ON support_tickets
  FOR ALL USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'agent')
    )
  );

-- Support messages: Access based on ticket access
DROP POLICY IF EXISTS "support_messages_ticket_access" ON support_messages;
CREATE POLICY "support_messages_ticket_access" ON support_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_messages.ticket_id
      AND (
        st.user_id = auth.uid() OR
        st.assigned_to = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('admin', 'agent')
        )
      )
    )
  );

-- Knowledge base: Public read for published articles
DROP POLICY IF EXISTS "knowledge_base_public_read" ON knowledge_base;
CREATE POLICY "knowledge_base_public_read" ON knowledge_base
  FOR SELECT USING (is_published = true);

-- AI chat conversations: Users see their own
DROP POLICY IF EXISTS "ai_chat_conversations_user_access" ON ai_chat_conversations;
CREATE POLICY "ai_chat_conversations_user_access" ON ai_chat_conversations
  FOR ALL USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND session_id IS NOT NULL) OR -- Anonymous access
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'agent')
    )
  );

-- AI chat messages: Access based on conversation access
DROP POLICY IF EXISTS "ai_chat_messages_conversation_access" ON ai_chat_messages;
CREATE POLICY "ai_chat_messages_conversation_access" ON ai_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_chat_conversations ac
      WHERE ac.id = ai_chat_messages.conversation_id
      AND (
        ac.user_id = auth.uid() OR
        (ac.user_id IS NULL AND ac.session_id IS NOT NULL) OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('admin', 'agent')
        )
      )
    )
  );

-- =======================
-- INITIAL DATA SETUP
-- =======================

-- Insert default support categories
INSERT INTO support_categories (name, description, icon, priority) VALUES
('Account Issues', 'Problems with user accounts, login, passwords', '🔐', 1),
('Booking Problems', 'Issues with creating, modifying, or cancelling bookings', '📅', 1),
('Payment Issues', 'Payment failures, refunds, billing questions', '💳', 1),
('Technical Support', 'App bugs, performance issues, technical problems', '🔧', 2),
('General Inquiry', 'General questions about the platform', '❓', 3),
('Feature Requests', 'Suggestions for new features or improvements', '💡', 4),
('Vendor Support', 'Support for service providers and vendors', '🏪', 2),
('Feedback', 'General feedback and suggestions', '📝', 5)
ON CONFLICT DO NOTHING;

-- Insert initial knowledge base articles
INSERT INTO knowledge_base (title, content, slug, keywords, is_published, is_featured) VALUES
(
  'How to Create Your First Booking',
  'Step-by-step guide to making your first booking on Bookiji...',
  'how-to-create-first-booking',
  ARRAY['booking', 'getting started', 'tutorial'],
  true,
  true
),
(
  'Payment Methods and Billing',
  'Information about accepted payment methods, billing cycles, and refunds...',
  'payment-methods-billing',
  ARRAY['payment', 'billing', 'refunds'],
  true,
  false
),
(
  'Vendor Onboarding Guide',
  'Complete guide for service providers to get started on Bookiji...',
  'vendor-onboarding-guide',
  ARRAY['vendor', 'onboarding', 'getting started'],
  true,
  true
)
ON CONFLICT DO NOTHING;

-- =======================
-- SUPPORT FUNCTIONS
-- =======================

-- Function to escalate AI chat to human support
CREATE OR REPLACE FUNCTION escalate_ai_chat_to_human(
  p_conversation_id UUID,
  p_reason TEXT DEFAULT 'Customer requested human agent'
) RETURNS UUID AS $$
DECLARE
  ticket_id UUID;
  conversation_record RECORD;
  chat_history TEXT;
BEGIN
  -- Get conversation details
  SELECT * INTO conversation_record
  FROM ai_chat_conversations
  WHERE id = p_conversation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
  
  -- Build chat history
  SELECT string_agg(
    sender_type || ': ' || message, 
    E'\n' ORDER BY message_order
  ) INTO chat_history
  FROM ai_chat_messages
  WHERE conversation_id = p_conversation_id;
  
  -- Create support ticket
  INSERT INTO support_tickets (
    user_id,
    category_id,
    subject,
    description,
    priority,
    status,
    metadata
  ) VALUES (
    conversation_record.user_id,
    (SELECT id FROM support_categories WHERE name = 'General Inquiry' LIMIT 1),
    'Escalated from AI Chat - ' || COALESCE(conversation_record.intent, 'General Inquiry'),
    'Customer requested human support after AI chat.' || E'\n\n' ||
    'Escalation Reason: ' || p_reason || E'\n\n' ||
    'Chat History:' || E'\n' || COALESCE(chat_history, 'No chat history available'),
    'medium',
    'open',
    jsonb_build_object(
      'escalated_from_ai', true,
      'original_conversation_id', p_conversation_id,
      'ai_confidence_avg', conversation_record.ai_confidence_avg
    )
  ) RETURNING id INTO ticket_id;
  
  -- Update conversation as escalated
  UPDATE ai_chat_conversations
  SET escalated_to_human = true,
      escalated_at = NOW(),
      updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  content TEXT,
  slug VARCHAR(255),
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.title,
    kb.content,
    kb.slug,
    ts_rank(kb.search_vector, plainto_tsquery('english', p_query)) as rank
  FROM knowledge_base kb
  WHERE kb.is_published = true
    AND kb.search_vector @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, kb.view_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- GRANTS AND PERMISSIONS
-- =======================

-- Grant appropriate permissions
GRANT SELECT ON support_categories TO authenticated, anon;
GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_messages TO authenticated;
GRANT SELECT ON knowledge_base TO authenticated, anon;
GRANT ALL ON ai_chat_conversations TO authenticated, anon;
GRANT ALL ON ai_chat_messages TO authenticated, anon;
GRANT SELECT ON support_automation_rules TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION escalate_ai_chat_to_human TO authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_base TO authenticated, anon;

COMMENT ON TABLE support_tickets IS '3-tier support system: tickets for human agents';
COMMENT ON TABLE ai_chat_conversations IS '3-tier support system: AI-powered chat conversations';
COMMENT ON TABLE knowledge_base IS '3-tier support system: self-service knowledge base';
COMMENT ON TABLE support_automation_rules IS '3-tier support system: rule-based automation'; 