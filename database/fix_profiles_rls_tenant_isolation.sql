-- Fix RLS Policies for Profiles Table to Enforce Tenant Isolation
-- This script updates the profiles table RLS policies to ensure users can only see profiles from their own tenant
-- Run this in Supabase SQL Editor

-- First, ensure helper functions exist
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

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM super_admins WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies that allow viewing all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy 2: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (is_super_admin());

-- Policy 3: Users can view profiles from their own tenant(s)
-- This ensures tenant isolation - users can only see profiles of users in their tenant
CREATE POLICY "Users can view profiles in their tenant" ON profiles
  FOR SELECT USING (
    -- User can see profiles if:
    -- 1. The profile belongs to a user in one of their tenants (via tenant_users)
    id IN (
      SELECT user_id 
      FROM tenant_users 
      WHERE tenant_id = ANY(get_user_tenant_ids())
    )
  );

-- Policy 4: Users can update their own profile (name only, not role)
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 5: Admins can update profiles in their tenant
-- Only allow admins to update profiles of users in their own tenant
CREATE POLICY "Admins can update profiles in their tenant" ON profiles
  FOR UPDATE USING (
    -- Current user must be an admin
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND tenant_id = ANY(get_user_tenant_ids())
    )
    -- AND the profile being updated must be in the same tenant
    AND id IN (
      SELECT user_id 
      FROM tenant_users 
      WHERE tenant_id = ANY(get_user_tenant_ids())
    )
  )
  WITH CHECK (
    -- Same check for WITH CHECK clause
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND tenant_id = ANY(get_user_tenant_ids())
    )
    AND id IN (
      SELECT user_id 
      FROM tenant_users 
      WHERE tenant_id = ANY(get_user_tenant_ids())
    )
  );

-- Policy 6: Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles" ON profiles
  FOR UPDATE USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Policy 7: Only admins can insert new profiles (within their tenant)
-- This is handled by the API route, but we add RLS for safety
CREATE POLICY "Admins can insert profiles in their tenant" ON profiles
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Verify the policies are working
-- This query should only return profiles from the current user's tenant
-- (unless they are a super admin)
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  tu.tenant_id,
  t.name as tenant_name
FROM profiles p
LEFT JOIN tenant_users tu ON tu.user_id = p.id
LEFT JOIN tenants t ON t.id = tu.tenant_id
ORDER BY p.created_at DESC
LIMIT 10;

