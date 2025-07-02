-- List all tables in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- For each table, show its columns and constraints
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    tc.constraint_type,
    cc.table_name as referenced_table,
    cc.column_name as referenced_column
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
LEFT JOIN information_schema.key_column_usage kcu
    ON t.table_name = kcu.table_name 
    AND t.table_schema = kcu.table_schema
    AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc
    ON kcu.constraint_name = tc.constraint_name
    AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage cc
    ON tc.constraint_name = cc.constraint_name
    AND tc.table_schema = cc.table_schema
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- Show all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show all indices
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 1. Core User & Profile Tables
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'profiles',
        'user_sessions',
        'user_blocks',
        'admin_permissions'
    )
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;

-- 2. Booking Related Tables
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'services',
        'availability_slots',
        'bookings'
    )
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;

-- 3. AI & Chat Tables
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'ai_chat_conversations',
        'ai_chat_messages',
        'knowledge_base'
    )
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;

-- 4. Analytics & Tracking Tables
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'analytics_events',
        'analytics_alerts',
        'geographic_analytics',
        'page_analytics',
        'user_analytics',
        'user_segments',
        'feature_usage',
        'conversion_funnels'
    )
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;

-- 5. Support System Tables
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'support_tickets',
        'support_messages',
        'support_categories'
    )
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;

-- 6. Security & Admin Tables
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'security_logs',
        'rate_limits',
        'notifications'
    )
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name;

-- 7. Check for any tables we might have missed
SELECT 
    table_name
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (
        'profiles',
        'user_sessions',
        'user_blocks',
        'admin_permissions',
        'services',
        'availability_slots',
        'bookings',
        'ai_chat_conversations',
        'ai_chat_messages',
        'knowledge_base',
        'analytics_events',
        'analytics_alerts',
        'geographic_analytics',
        'page_analytics',
        'user_analytics',
        'user_segments',
        'feature_usage',
        'conversion_funnels',
        'support_tickets',
        'support_messages',
        'support_categories',
        'security_logs',
        'rate_limits',
        'notifications'
    )
ORDER BY 
    table_name;

-- 8. Check Foreign Key Relationships
SELECT
    tc.table_name as table_name,
    kcu.column_name as column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY
    tc.table_name,
    kcu.column_name; 