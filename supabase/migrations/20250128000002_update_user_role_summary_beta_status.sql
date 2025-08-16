-- Update user_role_summary view to include beta_status
DROP VIEW IF EXISTS user_role_summary;
CREATE VIEW user_role_summary AS
SELECT
  p.id as user_id,
  p.email,
  p.full_name,
  p.beta_status,
  ARRAY_AGG(ur.role ORDER BY ur.role) as roles,
  CASE
    WHEN 'customer' = ANY(ARRAY_AGG(ur.role)) THEN true
    ELSE false
  END as can_book_services,
  CASE
    WHEN 'vendor' = ANY(ARRAY_AGG(ur.role)) THEN true
    ELSE false
  END as can_offer_services,
  CASE
    WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN true
    ELSE false
  END as is_admin,
  p.created_at,
  p.updated_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.email, p.full_name, p.beta_status, p.created_at, p.updated_at;
