-- Fix vehicle_inward RLS to allow ALL tenant users (Admin, Manager, Coordinator) to insert
-- This ensures the application works for all roles, not just admins

-- Step 1: Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can insert their tenant vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Super admins can insert all vehicle_inward" ON vehicle_inward;

-- Step 2: Create INSERT policy that allows ANY authenticated tenant user to insert
-- This policy does NOT restrict by role - any user in tenant_users can insert
CREATE POLICY "Tenant users can insert vehicle_inward" ON vehicle_inward
  FOR INSERT
  WITH CHECK (
    -- Super admin can insert anything
    is_super_admin()
    OR
    -- ANY authenticated user who belongs to the tenant can insert
    (
      auth.uid() IS NOT NULL
      AND (
        -- Check if tenant_id is in user's tenant_ids array (from tenant_users)
        tenant_id = ANY(get_user_tenant_ids())
        OR
        -- Direct check: tenant_id exists in tenant_users for this user
        -- This ensures the user belongs to the tenant they're inserting for
        tenant_id IN (
          SELECT tu.tenant_id 
          FROM tenant_users tu
          WHERE tu.user_id = auth.uid()
        )
      )
    )
  );

-- Step 3: Super admin explicit policy (redundant but explicit)
CREATE POLICY "Super admins can insert all vehicle_inward" ON vehicle_inward
  FOR INSERT
  WITH CHECK (is_super_admin());

-- Step 4: Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vehicle_inward'
  AND cmd = 'INSERT'
ORDER BY policyname;

