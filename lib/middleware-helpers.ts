import { headers } from 'next/headers'
import { UserRole } from '@/lib/rbac'

/**
 * Extract user role from middleware headers
 * This is useful for server components that need role information
 * without making additional database calls
 */
export async function getRoleFromHeaders(): Promise<UserRole | null> {
  try {
    const headersList = await headers()
    const role = headersList.get('x-role') as UserRole | null
    return role
  } catch (error) {
    console.error('Error extracting role from headers:', error)
    return null
  }
}

/**
 * Extract user ID from middleware headers
 */
export async function getUserIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    return userId
  } catch (error) {
    console.error('Error extracting user ID from headers:', error)
    return null
  }
}

/**
 * Check if user has specific role from headers
 */
export async function hasRoleFromHeaders(requiredRole: UserRole): Promise<boolean> {
  const userRole = await getRoleFromHeaders()
  return userRole === requiredRole
}

/**
 * Check if user has any of the specified roles from headers
 */
export async function hasAnyRoleFromHeaders(requiredRoles: UserRole[]): Promise<boolean> {
  const userRole = await getRoleFromHeaders()
  return userRole ? requiredRoles.includes(userRole) : false
}