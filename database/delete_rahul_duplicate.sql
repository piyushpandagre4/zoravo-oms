-- Quick fix: Delete duplicate tenant link for Rahul
-- This will keep the OLDEST link (Z02) and delete the newer one (Z01)

-- Step 1: Preview what will be DELETED (should show Z01 link)
SELECT 
  'Will DELETE' as action,
  t.tenant_code,
  t.name as tenant_name,
  p.name as manager_name,
  p.email,
  tu.created_at as linked_at,
  tu.id as tenant_user_id
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
  AND (p.name ILIKE '%rahul%' OR p.email ILIKE '%rahul%')
  AND tu.id NOT IN (
    SELECT DISTINCT ON (tu2.user_id) tu2.id
    FROM tenant_users tu2
    JOIN profiles p2 ON p2.id = tu2.user_id
    WHERE tu2.role = 'manager'
      AND (p2.name ILIKE '%rahul%' OR p2.email ILIKE '%rahul%')
    ORDER BY tu2.user_id, tu2.created_at ASC
  )
ORDER BY tu.created_at;

-- Step 2: Preview what will be KEPT (should show Z02 link)
SELECT 
  'Will KEEP' as action,
  t.tenant_code,
  t.name as tenant_name,
  p.name as manager_name,
  p.email,
  tu.created_at as linked_at,
  tu.id as tenant_user_id
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
  AND (p.name ILIKE '%rahul%' OR p.email ILIKE '%rahul%')
  AND tu.id IN (
    SELECT DISTINCT ON (tu2.user_id) tu2.id
    FROM tenant_users tu2
    JOIN profiles p2 ON p2.id = tu2.user_id
    WHERE tu2.role = 'manager'
      AND (p2.name ILIKE '%rahul%' OR p2.email ILIKE '%rahul%')
    ORDER BY tu2.user_id, tu2.created_at ASC
  )
ORDER BY tu.created_at;

-- Step 3: EXECUTE - Delete the duplicate link
-- ⚠️ Run this AFTER reviewing Steps 1 and 2 above ⚠️
DELETE FROM tenant_users tu
WHERE tu.role = 'manager'
  AND tu.id IN (
    SELECT tu2.id
    FROM tenant_users tu2
    JOIN profiles p2 ON p2.id = tu2.user_id
    WHERE tu2.role = 'manager'
      AND (p2.name ILIKE '%rahul%' OR p2.email ILIKE '%rahul%')
      AND tu2.id NOT IN (
        SELECT DISTINCT ON (tu3.user_id) tu3.id
        FROM tenant_users tu3
        JOIN profiles p3 ON p3.id = tu3.user_id
        WHERE tu3.role = 'manager'
          AND (p3.name ILIKE '%rahul%' OR p3.email ILIKE '%rahul%')
        ORDER BY tu3.user_id, tu3.created_at ASC
      )
  );

-- Step 4: Verify - should show only ONE link now
SELECT 
  'VERIFY: Final state' as action,
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
  AND (p.name ILIKE '%rahul%' OR p.email ILIKE '%rahul%')
ORDER BY t.tenant_code, p.name;

