-- Enable Row Level Security (RLS) on vehicle_inward table
-- This ensures tenant isolation at the database level, preventing data leakage

-- Step 1: Enable RLS on vehicle_inward table
ALTER TABLE vehicle_inward ENABLE ROW LEVEL SECURITY;

-- Step 2: Create helper function to get user's tenant IDs (if it doesn't exist)
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS UUID[] AS $$
DECLARE
    tenant_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(tenant_id) INTO tenant_ids
    FROM tenant_users
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(tenant_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create helper function to check if user is super admin (if it doesn't exist)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM super_admins WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Users can insert their tenant vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Users can update their tenant vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Users can delete their tenant vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Super admins can view all vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Super admins can insert all vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Super admins can update all vehicle_inward" ON vehicle_inward;
DROP POLICY IF EXISTS "Super admins can delete all vehicle_inward" ON vehicle_inward;

-- Step 5: Create SELECT policy - Users can only see vehicle_inward entries from their tenants
CREATE POLICY "Users can view their tenant vehicle_inward" ON vehicle_inward
    FOR SELECT
    USING (
        tenant_id = ANY(get_user_tenant_ids())
        OR is_super_admin()
        OR tenant_id IS NULL  -- Allow viewing entries without tenant_id (legacy data)
    );

-- Step 6: Create INSERT policy - Users can only insert vehicle_inward entries for their tenants
CREATE POLICY "Users can insert their tenant vehicle_inward" ON vehicle_inward
    FOR INSERT
    WITH CHECK (
        tenant_id = ANY(get_user_tenant_ids())
        OR is_super_admin()
    );

-- Step 7: Create UPDATE policy - Users can only update vehicle_inward entries from their tenants
CREATE POLICY "Users can update their tenant vehicle_inward" ON vehicle_inward
    FOR UPDATE
    USING (
        tenant_id = ANY(get_user_tenant_ids())
        OR is_super_admin()
    )
    WITH CHECK (
        tenant_id = ANY(get_user_tenant_ids())
        OR is_super_admin()
    );

-- Step 8: Create DELETE policy - Users can only delete vehicle_inward entries from their tenants
CREATE POLICY "Users can delete their tenant vehicle_inward" ON vehicle_inward
    FOR DELETE
    USING (
        tenant_id = ANY(get_user_tenant_ids())
        OR is_super_admin()
    );

-- Step 9: Create policies for super admins (explicit access to all data)
CREATE POLICY "Super admins can view all vehicle_inward" ON vehicle_inward
    FOR SELECT
    USING (is_super_admin());

CREATE POLICY "Super admins can insert all vehicle_inward" ON vehicle_inward
    FOR INSERT
    WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update all vehicle_inward" ON vehicle_inward
    FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete all vehicle_inward" ON vehicle_inward
    FOR DELETE
    USING (is_super_admin());

-- Step 10: Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'vehicle_inward'
ORDER BY policyname;

-- Step 11: Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'vehicle_inward';

SELECT '✅ RLS policies created for vehicle_inward table!' as result;
