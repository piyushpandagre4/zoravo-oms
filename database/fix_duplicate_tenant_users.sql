-- Fix managers (and other users) that are incorrectly linked to multiple tenants
-- This script will keep only ONE tenant link per user, based on creation date
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THIS SCRIPT! ⚠️

-- Step 1: PREVIEW - Show what will be deleted (run this first to review)
SELECT 
  'PREVIEW: Links that will be DELETED' as action,
  t.tenant_code,
  t.name as tenant_name,
  p.name as manager_name,
  p.email,
  tu.created_at as link_created_at,
  tu.id as tenant_user_id
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
  AND tu.id IN (
    -- Find all tenant_user links except the first (oldest) one for each manager
    SELECT tu2.id
    FROM tenant_users tu2
    WHERE tu2.role = 'manager'
      AND tu2.user_id IN (
        -- Managers linked to multiple tenants
        SELECT tu3.user_id
        FROM tenant_users tu3
        WHERE tu3.role = 'manager'
        GROUP BY tu3.user_id
        HAVING COUNT(DISTINCT tu3.tenant_id) > 1
      )
      AND tu2.id NOT IN (
        -- Keep the oldest link for each manager
        SELECT MIN(tu4.id)
        FROM tenant_users tu4
        WHERE tu4.role = 'manager'
          AND tu4.user_id IN (
            SELECT tu5.user_id
            FROM tenant_users tu5
            WHERE tu5.role = 'manager'
            GROUP BY tu5.user_id
            HAVING COUNT(DISTINCT tu5.tenant_id) > 1
          )
        GROUP BY tu4.user_id
      )
  )
ORDER BY p.name, t.tenant_code;

-- Step 2: PREVIEW - Show what will be KEPT
SELECT 
  'PREVIEW: Links that will be KEPT' as action,
  t.tenant_code,
  t.name as tenant_name,
  p.name as manager_name,
  p.email,
  tu.created_at as link_created_at,
  tu.id as tenant_user_id
FROM tenant_users tu
JOIN profiles p ON p.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.role = 'manager'
  AND tu.id IN (
    -- Keep the oldest link for each manager
    SELECT MIN(tu4.id)
    FROM tenant_users tu4
    WHERE tu4.role = 'manager'
      AND tu4.user_id IN (
        SELECT tu5.user_id
        FROM tenant_users tu5
        WHERE tu5.role = 'manager'
        GROUP BY tu5.user_id
        HAVING COUNT(DISTINCT tu5.tenant_id) > 1
      )
    GROUP BY tu4.user_id
  )
ORDER BY p.name;

-- Step 3: ACTUAL FIX - Delete duplicate links (UNCOMMENT TO RUN)
-- ⚠️ ONLY RUN THIS AFTER REVIEWING THE PREVIEW ABOVE! ⚠️
/*
DELETE FROM tenant_users tu
WHERE tu.role = 'manager'
  AND tu.id IN (
    -- Find all tenant_user links except the first (oldest) one for each manager
    SELECT tu2.id
    FROM tenant_users tu2
    WHERE tu2.role = 'manager'
      AND tu2.user_id IN (
        -- Managers linked to multiple tenants
        SELECT tu3.user_id
        FROM tenant_users tu3
        WHERE tu3.role = 'manager'
        GROUP BY tu3.user_id
        HAVING COUNT(DISTINCT tu3.tenant_id) > 1
      )
      AND tu2.id NOT IN (
        -- Keep the oldest link for each manager
        SELECT MIN(tu4.id)
        FROM tenant_users tu4
        WHERE tu4.role = 'manager'
          AND tu4.user_id IN (
            SELECT tu5.user_id
            FROM tenant_users tu5
            WHERE tu5.role = 'manager'
            GROUP BY tu5.user_id
            HAVING COUNT(DISTINCT tu5.tenant_id) > 1
          )
        GROUP BY tu4.user_id
      )
  );
*/

-- Step 4: After running the DELETE, verify the fix
SELECT 
  'VERIFICATION: Users still linked to multiple tenants' as check_type,
  COUNT(*) as count
FROM (
  SELECT tu.user_id
  FROM tenant_users tu
  WHERE tu.role = 'manager'
  GROUP BY tu.user_id
  HAVING COUNT(DISTINCT tu.tenant_id) > 1
) duplicates;

-- Step 5: Show final state - all managers and their tenant (should show each manager only once)
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

