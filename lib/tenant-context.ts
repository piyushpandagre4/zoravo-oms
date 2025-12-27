import { createClient } from '@/lib/supabase/client'

// Mark server-only functions - these should never be called from client components
// They use dynamic imports to prevent Next.js from bundling server code

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
// IMPORTANT: For API routes, always pass the supabase client as the second parameter
// For server components, use getTenantIdForUserServer() instead
export async function getTenantIdForUser(userId: string, supabase: any): Promise<string | null> {
  if (!supabase) {
    throw new Error('getTenantIdForUser requires a supabase client. Use getTenantIdForUserServer() for server components.')
  }

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

// Helper to dynamically import server module (prevents static analysis)
// This function uses a pattern that Next.js cannot statically analyze
async function getServerModule() {
  // Use a pattern that Next.js bundler cannot statically analyze
  // By using a function that returns the path, we prevent static analysis
  const getPath = () => {
    const parts = ['supabase', 'server']
    return `./${parts[0]}/${parts[1]}`
  }
  const path = getPath()
  // Use dynamic import with runtime-constructed path
  return import(path)
}

// Server component version (uses dynamic import to avoid build issues)
export async function getTenantIdForUserServer(userId: string): Promise<string | null> {
  const serverModule = await getServerModule()
  const client = serverModule.createClient()
  
  const { data, error } = await client
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
// IMPORTANT: For API routes, always pass the supabase client as the second parameter
// For server components, use checkIsSuperAdminServer() instead
export async function checkIsSuperAdmin(userId: string, supabase: any): Promise<boolean> {
  if (!supabase) {
    throw new Error('checkIsSuperAdmin requires a supabase client. Use checkIsSuperAdminServer() for server components.')
  }

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

// Server component version (uses dynamic import to avoid build issues)
export async function checkIsSuperAdminServer(userId: string): Promise<boolean> {
  const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'
  
  const serverModule = await getServerModule()
  const client = serverModule.createClient()
  
  // Check if user is in super_admins table
  const { data: superAdmin, error: superAdminError } = await client
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!superAdminError && superAdmin) {
    return true
  }

  // Check if user is admin in RS Car Accessories tenant
  const { data: rsCarAdmin, error: rsCarAdminError } = await client
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
  // Use dynamic import with string literal to prevent static analysis
  const serverPath = './supabase/server'
  const serverModule = await import(serverPath)
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
// IMPORTANT: For API routes, pass a supabase client. For server components, use validateTenantAccessServer()
export async function validateTenantAccess(
  userId: string,
  tenantId: string,
  supabase: any
): Promise<boolean> {
  if (!supabase) {
    throw new Error('validateTenantAccess requires a supabase client. Use validateTenantAccessServer() for server components.')
  }

  // Check if super admin
  const isSuper = await checkIsSuperAdmin(userId, supabase)
  if (isSuper) {
    return true
  }

  const { data, error } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  return !error && !!data
}

// Server component version
export async function validateTenantAccessServer(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const serverModule = await getServerModule()
  const supabase = serverModule.createClient()
  
  // Check if super admin
  const isSuper = await checkIsSuperAdminServer(userId)
  if (isSuper) {
    return true
  }

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

