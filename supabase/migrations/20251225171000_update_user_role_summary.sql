-- Restore user_role_summary view to fix "Database error querying schema" during login
-- Updated to include 'role' column alias and wider grants.

DROP VIEW IF EXISTS user_role_summary;

CREATE OR REPLACE VIEW user_role_summary AS
SELECT 
    p.auth_user_id as user_id,
    p.email,
    p.full_name,
    p.role, -- Expose as 'role' directly
    p.role as primary_role, -- And as 'primary_role' for clarity
    p.created_at,
    p.updated_at,
    -- Aggregated roles from user_roles table
    COALESCE(
        ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL),
        ARRAY[]::text[]
    ) || ARRAY[p.role] as roles,
    -- Capabilities
    (
        p.role = 'admin' OR 
        'admin' = ANY(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL))
    ) as is_admin,
    (
        p.role IN ('customer', 'admin') OR 
        'customer' = ANY(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL)) OR
        'admin' = ANY(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL))
    ) as can_book_services,
    (
        p.role IN ('vendor', 'admin') OR 
        'vendor' = ANY(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL)) OR
        'admin' = ANY(ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL))
    ) as can_offer_services
FROM profiles p
LEFT JOIN app_users au ON au.auth_user_id = p.auth_user_id
LEFT JOIN user_roles ur ON ur.app_user_id = au.id
GROUP BY p.auth_user_id, p.email, p.full_name, p.role, p.created_at, p.updated_at;

-- Grant access to authenticated users
GRANT SELECT ON user_role_summary TO authenticated;
GRANT SELECT ON user_role_summary TO anon;
GRANT SELECT ON user_role_summary TO service_role;
GRANT SELECT ON user_role_summary TO postgres;
GRANT SELECT ON user_role_summary TO supabase_auth_admin;
GRANT SELECT ON user_role_summary TO dashboard_user;

