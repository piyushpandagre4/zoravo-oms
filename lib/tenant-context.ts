import { createClient } from '@/lib/supabase/client'

// Client-side: Get current tenant ID from session storage
export function getCurrentTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('current_tenant_id')
}

// Client-side: Get current workspace URL
export function getCurrentWorkspaceUrl(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('current_workspace_url')
}

// Client-side: Check if user is super admin
export function isSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('is_super_admin') === 'true'
}

// Server-side: Get tenant ID from user's tenant_users relationship
export async function getTenantIdForUser(userId: string): Promise<string | null> {
  // Dynamic import to avoid importing server code in client components
  // Using string literal to prevent static analysis
  const serverModule = await import(
    /* webpackIgnore: true */ 
    '@/lib/supabase/server'
  )
  const supabase = serverModule.createClient()
  
  const { data, error } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.tenant_id
}

// Server-side: Check if user is super admin
// Returns true if user is in super_admins table OR is admin in RS Car Accessories tenant
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  // Dynamic import to avoid importing server code in client components
  // Using string literal to prevent static analysis
  const serverModule = await import(
    /* webpackIgnore: true */ 
    '@/lib/supabase/server'
  )
  const supabase = serverModule.createClient()
  const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'
  
  // Check if user is in super_admins table
  const { data: superAdmin, error: superAdminError } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!superAdminError && superAdmin) {
    return true
  }

  // Check if user is admin in RS Car Accessories tenant
  const { data: rsCarAdmin, error: rsCarAdminError } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', RS_CAR_ACCESSORIES_TENANT_ID)
    .eq('role', 'admin')
    .single()

  return !rsCarAdminError && !!rsCarAdmin
}

// Server-side: Get user's tenants
export async function getUserTenants(userId: string) {
  // Dynamic import to avoid importing server code in client components
  // Using string literal to prevent static analysis
  const serverModule = await import(
    /* webpackIgnore: true */ 
    '@/lib/supabase/server'
  )
  const supabase = serverModule.createClient()
  
  const { data, error } = await supabase
    .from('tenant_users')
    .select(`
      tenant_id,
      role,
      is_primary_admin,
      tenants (
        id,
        name,
        workspace_url,
        is_active,
        is_free,
        subscription_status
      )
    `)
    .eq('user_id', userId)

  if (error || !data) {
    return []
  }

  return data.map((tu: any) => ({
    tenant_id: tu.tenant_id,
    role: tu.role,
    is_primary_admin: tu.is_primary_admin,
    tenant: tu.tenants
  }))
}

// Server-side: Validate tenant access for a user
export async function validateTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  // Check if super admin
  const isSuper = await checkIsSuperAdmin(userId)
  if (isSuper) {
    return true
  }

  // Dynamic import to avoid importing server code in client components
  // Using string literal to prevent static analysis
  const serverModule = await import(
    /* webpackIgnore: true */ 
    '@/lib/supabase/server'
  )
  const supabase = serverModule.createClient()
  const { data, error } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  return !error && !!data
}

// Add tenant_id filter to a Supabase query
export function addTenantFilter<T>(
  query: any,
  tenantId: string | null,
  isSuperAdmin: boolean = false
): any {
  if (isSuperAdmin || !tenantId) {
    return query
  }
  
  return query.eq('tenant_id', tenantId)
}

// Helper to get tenant context from request headers/cookies
export async function getTenantContextFromRequest(request: Request): Promise<{
  tenantId: string | null
  isSuperAdmin: boolean
  userId: string | null
}> {
  // This would need to be implemented based on how you store tenant context
  // For now, returning defaults
  return {
    tenantId: null,
    isSuperAdmin: false,
    userId: null
  }
}

