-- Fix "Rahul" manager showing in both Z01 and Z02
-- This script will help identify and fix the duplicate tenant link issue

-- Step 1: Check if "Rahul" is linked to multiple tenants
SELECT 
  'CHECK: Managers named Rahul' as action,
  tu.user_id,
  p.name,
  p.email,
  t.tenant_code,
  t.name as tenant_name,
  tu.role,
  tu.created_at as linked_at,
  tu.id as tenant_user_id
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
  AND (p.name ILIKE '%rahul%' OR p.email ILIKE '%rahul%')
ORDER BY tu.created_at;

-- Step 2: Check if any "Rahul" user is linked to multiple tenants
SELECT 
  'CHECK: Rahul users linked to multiple tenants' as action,
  p.id as user_id,
  p.name,
  p.email,
  COUNT(DISTINCT tu.tenant_id) as tenant_count,
  STRING_AGG(DISTINCT t.tenant_code, ', ') as tenant_codes,
  STRING_AGG(DISTINCT tu.tenant_id::text, ', ') as tenant_ids
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
  AND (p.name ILIKE '%rahul%' OR p.email ILIKE '%rahul%')
GROUP BY p.id, p.name, p.email
HAVING COUNT(DISTINCT tu.tenant_id) > 1;

-- Step 3: PREVIEW - Show which tenant link will be DELETED for Rahul
-- This will keep the OLDEST link (first created) and delete newer ones
SELECT 
  'PREVIEW: Will DELETE this link' as action,
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
    -- Keep the oldest link for each Rahul user (using created_at, not id)
    SELECT DISTINCT ON (tu2.user_id) tu2.id
    FROM tenant_users tu2
    JOIN profiles p2 ON p2.id = tu2.user_id
    WHERE tu2.role = 'manager'
      AND (p2.name ILIKE '%rahul%' OR p2.email ILIKE '%rahul%')
    ORDER BY tu2.user_id, tu2.created_at ASC
  )
ORDER BY tu.created_at;

-- Step 4: PREVIEW - Show which tenant link will be KEPT for Rahul
SELECT 
  'PREVIEW: Will KEEP this link' as action,
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
    -- Keep the oldest link for each Rahul user (using created_at, not id)
    SELECT DISTINCT ON (tu2.user_id) tu2.id
    FROM tenant_users tu2
    JOIN profiles p2 ON p2.id = tu2.user_id
    WHERE tu2.role = 'manager'
      AND (p2.name ILIKE '%rahul%' OR p2.email ILIKE '%rahul%')
    ORDER BY tu2.user_id, tu2.created_at ASC
  )
ORDER BY tu.created_at;

-- Step 5: EXECUTE - Delete duplicate tenant links for Rahul
-- ⚠️ UNCOMMENT AND RUN THIS ONLY AFTER REVIEWING THE PREVIEW QUERIES ABOVE ⚠️
/*
DELETE FROM tenant_users tu
WHERE tu.role = 'manager'
  AND tu.id IN (
    SELECT tu2.id
    FROM tenant_users tu2
    JOIN profiles p2 ON p2.id = tu2.user_id
    WHERE tu2.role = 'manager'
      AND (p2.name ILIKE '%rahul%' OR p2.email ILIKE '%rahul%')
      AND tu2.id NOT IN (
        -- Keep the oldest link for each Rahul user (using created_at, not id)
        SELECT DISTINCT ON (tu3.user_id) tu3.id
        FROM tenant_users tu3
        JOIN profiles p3 ON p3.id = tu3.user_id
        WHERE tu3.role = 'manager'
          AND (p3.name ILIKE '%rahul%' OR p3.email ILIKE '%rahul%')
        ORDER BY tu3.user_id, tu3.created_at ASC
      )
  );
*/

-- Step 6: Verify the fix - should show only ONE tenant link per Rahul
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

