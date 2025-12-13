-- Check if any managers (or other users) are linked to multiple tenants
-- This will help identify the root cause of the tenant data leakage issue

-- Find users linked to multiple tenants
SELECT 
  tu.user_id,
  p.name,
  p.email,
  p.role,
  COUNT(DISTINCT tu.tenant_id) as tenant_count,
  STRING_AGG(DISTINCT t.tenant_code, ', ') as tenant_codes,
  STRING_AGG(DISTINCT tu.tenant_id::text, ', ') as tenant_ids
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
GROUP BY tu.user_id, p.name, p.email, p.role
HAVING COUNT(DISTINCT tu.tenant_id) > 1
ORDER BY tenant_count DESC, p.name;

-- Show all managers and their tenant associations
SELECT 
  t.tenant_code,
  t.name as tenant_name,
  p.name as manager_name,
  p.email,
  tu.role,
  tu.created_at as linked_at
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
ORDER BY t.tenant_code, p.name;

