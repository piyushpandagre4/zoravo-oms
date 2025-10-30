import { notFound } from 'next/navigation'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'installer' | 'accountant'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  name: string
  created_at: string
  updated_at: string
}

// Route permissions mapping
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Dashboard - all roles can access
  '/dashboard': ['admin', 'manager', 'coordinator', 'installer', 'accountant'],
  
  // Vehicle Inward - managers, coordinators and installers
  '/inward': ['admin', 'manager', 'coordinator', 'installer'],
  '/inward/new': ['admin', 'manager', 'coordinator'],
  '/inward/edit': ['admin', 'manager', 'coordinator', 'installer'],
  
  // Vehicles - managers, coordinators, installers, and accountants
  '/vehicles': ['admin', 'manager', 'coordinator', 'installer', 'accountant'],
  '/vehicles/[id]': ['admin', 'manager', 'coordinator', 'installer', 'accountant'],
  
  // Trackers - coordinators and above
  '/trackers': ['admin', 'manager', 'coordinator'],
  
  // Requirements - managers and coordinators
  '/requirements': ['admin', 'manager', 'coordinator'],
  
  // Accounts - accountants and managers
  '/accounts': ['admin', 'manager', 'accountant'],
  '/accounts/invoices': ['admin', 'manager', 'accountant'],
  '/accounts/reports': ['admin', 'manager', 'accountant'],
  
  // Settings - admin, manager, coordinator, installer, accountant (UI restricts to Company tab for limited roles)
  '/settings': ['admin', 'manager', 'coordinator', 'installer', 'accountant'],
  // About page - available to all roles
  '/about': ['admin', 'manager', 'coordinator', 'installer', 'accountant'],
}

// API route permissions
export const API_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/api/export/payments': ['admin', 'manager', 'accountant'],
  '/api/export/expenses': ['admin', 'manager', 'accountant'],
  '/api/export/pnl': ['admin', 'manager', 'accountant'],
  '/api/vehicles': ['admin', 'manager', 'coordinator', 'installer'],
  '/api/work-orders': ['admin', 'manager', 'installer'],
  '/api/invoices': ['admin', 'manager', 'accountant'],
}

// Role hierarchy for access levels
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  manager: 4,
  coordinator: 3,
  installer: 2,
  accountant: 2
}

// Check if role can view revenue data (only admin and accountant can see revenue)
export function canViewRevenue(userRole: UserRole): boolean {
  return ['admin', 'accountant'].includes(userRole)
}

// Check if role can view financial data
export function canViewFinancialData(userRole: UserRole): boolean {
  return ['admin', 'manager', 'accountant'].includes(userRole)
}

// Check if role can modify vehicle inward status (installers can only update from 'in_progress' to 'complete')
export function canModifyInwardStatus(userRole: UserRole): boolean {
  return ['admin', 'manager', 'coordinator', 'installer'].includes(userRole)
}

// Permission checks
export function hasRouteAccess(userRole: UserRole, route: string): boolean {
  // Check exact route match first
  if (ROUTE_PERMISSIONS[route]) {
    return ROUTE_PERMISSIONS[route].includes(userRole)
  }
  
  // Check pattern matches (for dynamic routes)
  for (const [pattern, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      // Convert pattern to regex
      const regexPattern = pattern.replace(/\[.*?\]/g, '[^/]+')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(route)) {
        return allowedRoles.includes(userRole)
      }
    }
  }
  
  return false
}

export function hasApiRouteAccess(userRole: UserRole, route: string): boolean {
  // Check exact route match first
  if (API_ROUTE_PERMISSIONS[route]) {
    return API_ROUTE_PERMISSIONS[route].includes(userRole)
  }
  
  // Check pattern matches
  for (const [pattern, allowedRoles] of Object.entries(API_ROUTE_PERMISSIONS)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      const regexPattern = pattern.replace(/\[.*?\]/g, '[^/]+')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(route)) {
        return allowedRoles.includes(userRole)
      }
    }
  }
  
  return false
}

export function hasHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole]
}

export function canAccessUserManagement(userRole: UserRole): boolean {
  return ['admin', 'manager'].includes(userRole)
}

export function canAccessFinancialData(userRole: UserRole): boolean {
  return ['admin', 'manager', 'accountant'].includes(userRole)
}

export function canModifyVehicles(userRole: UserRole): boolean {
  return ['admin', 'manager', 'coordinator'].includes(userRole)
}

export function canInstallServices(userRole: UserRole): boolean {
  return ['admin', 'manager', 'installer'].includes(userRole)
}

export function canViewReports(userRole: UserRole): boolean {
  return ['admin', 'manager', 'accountant'].includes(userRole)
}

export function canExportData(userRole: UserRole): boolean {
  return ['admin', 'manager', 'accountant'].includes(userRole)
}

// Server-side role assertion helper
export async function assertRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  const supabase = createServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Get user profile with role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    notFound()
  }

  if (!allowedRoles.includes(profile.role as UserRole)) {
    notFound()
  }

  return profile as UserProfile
}

// Client-side role check helper
export async function checkUserRole(): Promise<UserProfile | null> {
  const supabase = createBrowserClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return profile as UserProfile
}

// Navigation items based on role
export function getNavigationItems(userRole: UserRole) {
  const items = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: 'LayoutDashboard',
      roles: ['admin', 'manager', 'coordinator', 'installer', 'accountant']
    },
    {
      title: 'Vehicle Inward',
      href: '/inward/new',
      icon: 'Car',
      roles: ['admin', 'manager', 'coordinator']
    },
    {
      title: 'Vehicle Management',
      href: '/vehicles',
      icon: 'Truck',
      roles: ['admin', 'manager', 'coordinator']
    },
    {
      title: 'Trackers',
      href: '/trackers',
      icon: 'Activity',
      roles: ['admin', 'manager', 'coordinator']
    },
    {
      title: 'Accounts',
      href: '/accounts',
      icon: 'DollarSign',
      roles: ['admin', 'accountant'],
      children: [
        {
          title: 'Invoices',
          href: '/accounts/invoices',
          icon: 'FileText',
          roles: ['admin', 'accountant']
        },
        {
          title: 'Reports',
          href: '/accounts/reports',
          icon: 'BarChart3',
          roles: ['admin', 'accountant']
        }
      ]
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: 'Settings',
      roles: ['admin', 'manager', 'installer', 'coordinator', 'accountant']
    },
    {
      title: 'About',
      href: '/about',
      icon: 'Settings',
      roles: ['admin', 'manager', 'installer', 'coordinator', 'accountant']
    }
  ]

  return items.filter(item => {
    if (Array.isArray(item.children)) {
      const filteredChildren = item.children.filter(child => child.roles.includes(userRole))
      return item.roles.includes(userRole) && filteredChildren.length > 0
    }
    return item.roles.includes(userRole)
  })
}

// Check if role can view dashboard with revenue
export function getDashboardViewConfig(userRole: UserRole) {
  return {
    showRevenue: canViewRevenue(userRole),
    showFinancialCharts: canViewFinancialData(userRole),
    showRecentEntries: true, // All roles can see this
    showStats: true, // All roles can see this
  }
}

// Work order access control
export function canAccessWorkOrder(userRole: UserRole, assignedTo?: string, currentUserId?: string): boolean {
  if (['admin', 'manager'].includes(userRole)) {
    return true
  }
  
  if (userRole === 'installer' && assignedTo && currentUserId) {
    // Installers can only access their own work orders
    return assignedTo === currentUserId
  }
  
  return false
}

// Service tracker access control
export function canAccessServiceTracker(userRole: UserRole, assignedTo?: string, currentUserId?: string): boolean {
  if (['admin', 'manager', 'coordinator'].includes(userRole)) {
    return true
  }
  
  if (userRole === 'installer' && assignedTo && currentUserId) {
    // Installers can only access their own service trackers
    return assignedTo === currentUserId
  }
  
  return false
}
