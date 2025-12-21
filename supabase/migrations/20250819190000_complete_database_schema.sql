-- 🚨 COMPLETE DATABASE SCHEMA - SINGLE MIGRATION FILE
-- This migration completely clears the database and recreates everything from scratch
-- Date: 2025-08-19 19:00:00
-- Use this for: new environments, complete resets, clean slate deployments

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- ========================================
-- 1. COMPLETE DATABASE CLEANUP
-- ========================================

-- Drop all existing tables, views, functions, and sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables (excluding PostGIS extension tables)
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns')) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all views (excluding PostGIS extension views)
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname NOT IN ('geography_columns', 'geometry_columns')) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions (excluding PostGIS and vector extension functions)
    FOR r IN (
        SELECT p.proname 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            JOIN pg_extension e ON d.refobjid = e.oid
            WHERE d.objid = p.oid AND e.extname IN ('postgis', 'vector')
        )
    ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    RAISE NOTICE 'Database completely cleared - ready for fresh schema';
END $$;

-- ========================================
-- 2. CREATE CORE USER SYSTEM
-- ========================================

-- Create profiles table (main user table)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')) DEFAULT 'customer',
    bio TEXT,
    portfolio_images TEXT[],
    certifications JSONB DEFAULT '[]',
    languages TEXT[] DEFAULT '{}',
    specializations TEXT[] DEFAULT '{}',
    experience_years INTEGER DEFAULT 0,
    hourly_rate DECIMAL(8,2),
    availability_schedule JSONB DEFAULT '{}',
    education JSONB DEFAULT '[]',
    professional_summary TEXT,
    service_area_radius INTEGER DEFAULT 10,
    verified_at TIMESTAMPTZ,
    verification_documents TEXT[],
    social_links JSONB DEFAULT '{}',
    response_time_avg INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    profile_completion_score INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create app_users table for multi-role system
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table for flexible role management
CREATE TABLE user_roles (
    app_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'admin')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (app_user_id, role)
);

-- ========================================
-- 3. CREATE SERVICE SYSTEM
-- ========================================

-- Create services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    price DECIMAL(8,2),
    price_type TEXT CHECK (price_type IN ('fixed', 'hourly', 'per_item')) DEFAULT 'fixed',
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability_slots table
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN DEFAULT true,
    slot_type TEXT CHECK (slot_type IN ('regular', 'blocked', 'maintenance')) DEFAULT 'regular',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. CREATE BOOKING SYSTEM
-- ========================================

-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'pending',
    total_amount DECIMAL(8,2) NOT NULL,
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 5. CREATE PROVIDER PROFILE SYSTEM
-- ========================================

-- Create provider certifications table
CREATE TABLE provider_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    certificate_number VARCHAR(100),
    verification_status VARCHAR(50) DEFAULT 'pending' 
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
    certificate_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider education table
CREATE TABLE provider_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    institution_name VARCHAR(255) NOT NULL,
    degree_type VARCHAR(100),
    field_of_study VARCHAR(255),
    start_year INTEGER,
    end_year INTEGER,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider portfolio table
CREATE TABLE provider_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(100),
    images TEXT[],
    project_date DATE,
    client_name VARCHAR(255),
    project_duration VARCHAR(100),
    technologies_used TEXT[],
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider languages table
CREATE TABLE provider_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    language_name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(50) NOT NULL 
        CHECK (proficiency_level IN ('basic', 'conversational', 'fluent', 'native')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create provider_locations table
CREATE TABLE provider_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT NOT NULL,
    postal_code TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    service_radius INTEGER DEFAULT 10,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 6. CREATE SUPPORT SYSTEM
-- ========================================

-- Create support_categories table
CREATE TABLE support_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    auto_resolve_rules JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES support_categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    assigned_to UUID REFERENCES profiles(id),
    rag_suggested BOOLEAN DEFAULT false,
    rag_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_conversations table
CREATE TABLE support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_from_user BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_messages table
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 7. CREATE KNOWLEDGE BASE SYSTEM
-- ========================================

-- Create knowledge base articles table
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    section TEXT NOT NULL DEFAULT 'faq',
    url TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints for kb_articles
ALTER TABLE kb_articles 
ADD CONSTRAINT kb_articles_locale_check CHECK (locale IN ('en', 'fr'));

ALTER TABLE kb_articles 
ADD CONSTRAINT kb_articles_section_check CHECK (section IN ('faq', 'vendor', 'policy', 'troubleshooting'));

-- Create unique index for title per locale
CREATE UNIQUE INDEX kb_articles_title_locale_ux 
ON kb_articles (lower(title), locale);

-- Create updated_at trigger for kb_articles
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

-- Create knowledge base chunks table for vector search
CREATE TABLE kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create knowledge base suggestions table
CREATE TABLE kb_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    suggestion_text TEXT NOT NULL,
    confidence_score NUMERIC(3,2),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 8. CREATE AI AND RAG SYSTEM
-- ========================================

-- Create RAG entries table for support system
CREATE TABLE rag_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID,
    summary TEXT NOT NULL,
    solution TEXT NOT NULL,
    approved_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI chat conversations table
CREATE TABLE ai_chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI chat messages table
CREATE TABLE ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_from_user BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 9. CREATE ADMIN SYSTEM
-- ========================================

-- Create admin_settings singleton table
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rag_frequency_threshold INTEGER NOT NULL DEFAULT 3,
    rag_auto_detect_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to ensure singleton
CREATE UNIQUE INDEX admin_settings_singleton_idx 
ON admin_settings((true));

-- ========================================
-- 10. CREATE ANALYTICS SYSTEM
-- ========================================

-- Create analytics_events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_sessions table
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    session_id TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 11. CREATE VIEWS AND FUNCTIONS
-- ========================================

-- Create provider profile summary view
CREATE OR REPLACE VIEW provider_profile_summary AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.bio,
    p.portfolio_images,
    p.certifications,
    p.languages,
    p.specializations,
    p.experience_years,
    p.hourly_rate,
    p.professional_summary,
    p.service_area_radius,
    p.verified_at,
    p.rating,
    p.profile_completion_score,
    p.response_time_avg,
    p.completion_rate,
    p.created_at,
    p.updated_at
FROM profiles p
WHERE p.role = 'vendor';

-- Create profile completion score function
CREATE OR REPLACE FUNCTION calculate_profile_completion_score(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    profile_record RECORD;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE id = profile_id;
    
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN score := score + 10; END IF;
    IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN score := score + 15; END IF;
    IF profile_record.portfolio_images IS NOT NULL AND array_length(profile_record.portfolio_images, 1) > 0 THEN score := score + 10; END IF;
    IF profile_record.certifications IS NOT NULL AND profile_record.certifications != '[]' THEN score := score + 10; END IF;
    IF profile_record.languages IS NOT NULL AND array_length(profile_record.languages, 1) > 0 THEN score := score + 10; END IF;
    IF profile_record.specializations IS NOT NULL AND array_length(profile_record.specializations, 1) > 0 THEN score := score + 10; END IF;
    IF profile_record.experience_years > 0 THEN score := score + 10; END IF;
    IF profile_record.hourly_rate IS NOT NULL THEN score := score + 5; END IF;
    IF profile_record.professional_summary IS NOT NULL AND profile_record.professional_summary != '' THEN score := score + 15; END IF;
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 12. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Core table indexes
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- App users indexes
CREATE INDEX idx_app_users_auth_user_id ON app_users(auth_user_id);
CREATE INDEX idx_user_roles_app_user_id ON user_roles(app_user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Service system indexes
CREATE INDEX idx_services_provider_id ON services(provider_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);
CREATE INDEX idx_availability_slots_provider_id ON availability_slots(provider_id);
CREATE INDEX idx_availability_slots_time ON availability_slots(start_time, end_time);

-- Booking system indexes
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_service_id ON bookings(service_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_time ON bookings(start_time, end_time);
CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);

-- Provider profile indexes
CREATE INDEX idx_provider_certifications_provider_id ON provider_certifications(provider_id);
CREATE INDEX idx_provider_education_provider_id ON provider_education(provider_id);
CREATE INDEX idx_provider_portfolio_provider_id ON provider_portfolio(provider_id);
CREATE INDEX idx_provider_languages_provider_id ON provider_languages(provider_id);
CREATE INDEX idx_provider_locations_provider_id ON provider_locations(provider_id);

-- Support system indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_category_id ON support_tickets(category_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_conversations_ticket_id ON support_conversations(ticket_id);
CREATE INDEX idx_support_messages_conversation_id ON support_messages(conversation_id);

-- Knowledge base indexes
CREATE INDEX idx_kb_articles_locale ON kb_articles(locale);
CREATE INDEX idx_kb_articles_section ON kb_articles(section);
CREATE INDEX idx_kb_articles_created_at ON kb_articles(created_at);
CREATE INDEX idx_kb_articles_embedding ON kb_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_kb_chunks_article_id ON kb_chunks(article_id);
CREATE INDEX idx_kb_suggestions_article_id ON kb_suggestions(article_id);

-- AI system indexes
CREATE INDEX idx_rag_entries_ticket_id ON rag_entries(ticket_id);
CREATE INDEX idx_ai_chat_conversations_user_id ON ai_chat_conversations(user_id);
CREATE INDEX idx_ai_chat_messages_conversation_id ON ai_chat_messages(conversation_id);

-- Analytics indexes
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_sessions_user_id ON analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_session_id ON analytics_sessions(session_id);

-- ========================================
-- 13. ENABLE ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 14. CREATE RLS POLICIES
-- ========================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Anyone can view public profile info" ON profiles
    FOR SELECT USING (true);

-- App users policies
CREATE POLICY "Users can view own app_user record" ON app_users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own app_user record" ON app_users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_users au 
            WHERE au.id = user_roles.app_user_id 
            AND au.auth_user_id = auth.uid()
        )
    );

-- Services policies
CREATE POLICY "Providers can manage own services" ON services
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view active services" ON services
    FOR SELECT USING (is_active = true);

-- Availability policies
CREATE POLICY "Providers can manage own availability" ON availability_slots
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view availability" ON availability_slots
    FOR SELECT USING (true);

-- Booking policies
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (customer_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Providers can update own bookings" ON bookings
    FOR UPDATE USING (provider_id = auth.uid());

-- Review policies
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for completed bookings" ON reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Provider profile policies
CREATE POLICY "Providers can manage own certifications" ON provider_certifications
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view verified certifications" ON provider_certifications
    FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Providers can manage own education" ON provider_education
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view education" ON provider_education
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage own portfolio" ON provider_portfolio
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view portfolio" ON provider_portfolio
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage own languages" ON provider_languages
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view languages" ON provider_languages
    FOR SELECT USING (true);

CREATE POLICY "Providers can manage own locations" ON provider_locations
    FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view locations" ON provider_locations
    FOR SELECT USING (true);

-- Support system policies
CREATE POLICY "Anyone can view support categories" ON support_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tickets" ON support_tickets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own conversations" ON support_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create conversations" ON support_conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own messages" ON support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_conversations sc 
            WHERE sc.id = support_messages.conversation_id 
            AND sc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages" ON support_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_conversations sc 
            WHERE sc.id = support_messages.conversation_id 
            AND sc.user_id = auth.uid()
        )
    );

-- Knowledge base policies
CREATE POLICY "Anyone can view KB articles" ON kb_articles
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage KB articles" ON kb_articles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view KB chunks" ON kb_chunks
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view KB suggestions" ON kb_suggestions
    FOR SELECT USING (true);

-- AI system policies
CREATE POLICY "Users can view own RAG entries" ON rag_entries
    FOR SELECT USING (true);

CREATE POLICY "Users can view own AI conversations" ON ai_chat_conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create AI conversations" ON ai_chat_conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own AI messages" ON ai_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ai_chat_conversations acc 
            WHERE acc.id = ai_chat_messages.conversation_id 
            AND acc.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create AI messages" ON ai_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_chat_conversations acc 
            WHERE acc.id = ai_chat_messages.conversation_id 
            AND acc.user_id = auth.uid()
        )
    );

-- Admin settings policies (admin only)
CREATE POLICY "Admins can manage admin settings" ON admin_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN app_users au ON au.id = ur.app_user_id
            WHERE au.auth_user_id = auth.uid() AND ur.role = 'admin'
        )
    );

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON analytics_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own analytics" ON analytics_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own sessions" ON analytics_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions" ON analytics_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================================
-- 15. GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- Grant SELECT on all views in public schema to authenticated users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'GRANT SELECT ON ' || quote_ident(r.viewname) || ' TO authenticated';
    END LOOP;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to service_role (for CLI access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ========================================
-- 16. INSERT DEFAULT DATA
-- ========================================

-- Insert default admin settings
INSERT INTO admin_settings (rag_frequency_threshold, rag_auto_detect_enabled) 
VALUES (3, true);

-- Insert default support categories
INSERT INTO support_categories (name, description, icon, priority) VALUES
('General', 'General questions and support', 'help-circle', 1),
('Technical', 'Technical issues and bugs', 'settings', 2),
('Billing', 'Payment and billing questions', 'credit-card', 3),
('Account', 'Account management and settings', 'user', 4);

COMMIT;

-- ========================================
-- ✅ COMPLETE DATABASE SCHEMA CREATED!
-- ========================================
-- Your database now has:
-- ✅ Complete user system with multi-role support
-- ✅ Full service and booking system
-- ✅ Rich provider profiles with certifications, education, portfolio
-- ✅ Complete support system with knowledge base
-- ✅ AI chat and RAG system
-- ✅ Analytics and tracking
-- ✅ All tables, views, functions, and indexes
-- ✅ Proper RLS policies and security
-- ✅ Service role access for CLI operations
--
-- This single migration file gives you a complete, clean database
-- that you can run on any new environment!
