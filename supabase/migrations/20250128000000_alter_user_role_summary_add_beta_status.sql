-- Add beta_status to user_role_summary view
CREATE OR REPLACE VIEW user_role_summary AS
SELECT
  p.id AS user_id,
  p.email,
  p.full_name,
  ARRAY_AGG(ur.role ORDER BY ur.role) AS roles,
  CASE
    WHEN 'customer' = ANY(ARRAY_AGG(ur.role)) THEN true
    ELSE false
  END AS can_book_services,
  CASE
    WHEN 'vendor' = ANY(ARRAY_AGG(ur.role)) THEN true
    ELSE false
  END AS can_offer_services,
  CASE
    WHEN 'admin' = ANY(ARRAY_AGG(ur.role)) THEN true
    ELSE false
  END AS is_admin,
  p.beta_status,
  p.created_at,
  p.updated_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.email, p.full_name, p.created_at, p.updated_at, p.beta_status;

-- Ensure permissions remain on the view
GRANT SELECT ON user_role_summary TO authenticated;
