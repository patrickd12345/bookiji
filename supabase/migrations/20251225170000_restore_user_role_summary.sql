-- Restore user_role_summary view to fix "Database error querying schema" during login
-- Updated to include 'role' column alias to satisfy potential Auth Hook dependencies.

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
-- Grant access to anon just in case the hook runs as anon (unlikely but safe for a summary view if RLS allows)
-- Note: Views run with the privileges of the user who called them, but RLS on underlying tables still applies.
-- However, since this view aggregates, we should be careful.
-- Given the "Permission Phase", I'll stick to 'authenticated' first. If it fails again, I'll add 'anon'.
