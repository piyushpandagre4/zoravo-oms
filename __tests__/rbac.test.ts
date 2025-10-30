import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hasRouteAccess,
  hasApiRouteAccess,
  hasHigherRole,
  canAccessUserManagement,
  canAccessFinancialData,
  canModifyVehicles,
  canInstallServices,
  canViewReports,
  canExportData,
  canAccessWorkOrder,
  canAccessServiceTracker,
  getNavigationItems,
  UserRole,
  ROUTE_PERMISSIONS,
  API_ROUTE_PERMISSIONS,
  ROLE_HIERARCHY
} from '@/lib/rbac'

describe('RBAC System', () => {
  describe('Route Access Control', () => {
    it('should allow admin access to all routes', () => {
      expect(hasRouteAccess('admin', '/dashboard')).toBe(true)
      expect(hasRouteAccess('admin', '/inward')).toBe(true)
      expect(hasRouteAccess('admin', '/vehicles')).toBe(true)
      expect(hasRouteAccess('admin', '/trackers')).toBe(true)
      expect(hasRouteAccess('admin', '/accounts')).toBe(true)
      expect(hasRouteAccess('admin', '/settings')).toBe(true)
    })

    it('should allow manager access to most routes except settings', () => {
      expect(hasRouteAccess('manager', '/dashboard')).toBe(true)
      expect(hasRouteAccess('manager', '/inward')).toBe(true)
      expect(hasRouteAccess('manager', '/vehicles')).toBe(true)
      expect(hasRouteAccess('manager', '/trackers')).toBe(true)
      expect(hasRouteAccess('manager', '/accounts')).toBe(true)
      expect(hasRouteAccess('manager', '/settings')).toBe(true)
    })

    it('should allow coordinator access to operational routes', () => {
      expect(hasRouteAccess('coordinator', '/dashboard')).toBe(true)
      expect(hasRouteAccess('coordinator', '/inward')).toBe(true)
      expect(hasRouteAccess('coordinator', '/vehicles')).toBe(true)
      expect(hasRouteAccess('coordinator', '/trackers')).toBe(true)
      expect(hasRouteAccess('coordinator', '/accounts')).toBe(false)
      expect(hasRouteAccess('coordinator', '/settings')).toBe(false)
    })

    it('should allow installer access to limited routes', () => {
      expect(hasRouteAccess('installer', '/dashboard')).toBe(true)
      expect(hasRouteAccess('installer', '/inward')).toBe(false)
      expect(hasRouteAccess('installer', '/vehicles')).toBe(true)
      expect(hasRouteAccess('installer', '/trackers')).toBe(false)
      expect(hasRouteAccess('installer', '/accounts')).toBe(false)
      expect(hasRouteAccess('installer', '/settings')).toBe(false)
    })

    it('should allow accountant access to financial routes', () => {
      expect(hasRouteAccess('accountant', '/dashboard')).toBe(true)
      expect(hasRouteAccess('accountant', '/inward')).toBe(false)
      expect(hasRouteAccess('accountant', '/vehicles')).toBe(false)
      expect(hasRouteAccess('accountant', '/trackers')).toBe(false)
      expect(hasRouteAccess('accountant', '/accounts')).toBe(true)
      expect(hasRouteAccess('accountant', '/settings')).toBe(false)
    })

    it('should handle dynamic routes correctly', () => {
      expect(hasRouteAccess('admin', '/vehicles/123')).toBe(true)
      expect(hasRouteAccess('installer', '/vehicles/123')).toBe(true)
      expect(hasRouteAccess('accountant', '/vehicles/123')).toBe(false)
    })
  })

  describe('API Route Access Control', () => {
    it('should allow financial roles to access export endpoints', () => {
      expect(hasApiRouteAccess('admin', '/api/export/payments')).toBe(true)
      expect(hasApiRouteAccess('manager', '/api/export/payments')).toBe(true)
      expect(hasApiRouteAccess('accountant', '/api/export/payments')).toBe(true)
      expect(hasApiRouteAccess('coordinator', '/api/export/payments')).toBe(false)
      expect(hasApiRouteAccess('installer', '/api/export/payments')).toBe(false)
    })

    it('should allow appropriate roles to access vehicle endpoints', () => {
      expect(hasApiRouteAccess('admin', '/api/vehicles')).toBe(true)
      expect(hasApiRouteAccess('manager', '/api/vehicles')).toBe(true)
      expect(hasApiRouteAccess('coordinator', '/api/vehicles')).toBe(true)
      expect(hasApiRouteAccess('installer', '/api/vehicles')).toBe(true)
      expect(hasApiRouteAccess('accountant', '/api/vehicles')).toBe(false)
    })

    it('should allow work order access to appropriate roles', () => {
      expect(hasApiRouteAccess('admin', '/api/work-orders')).toBe(true)
      expect(hasApiRouteAccess('manager', '/api/work-orders')).toBe(true)
      expect(hasApiRouteAccess('installer', '/api/work-orders')).toBe(true)
      expect(hasApiRouteAccess('coordinator', '/api/work-orders')).toBe(false)
      expect(hasApiRouteAccess('accountant', '/api/work-orders')).toBe(false)
    })
  })

  describe('Role Hierarchy', () => {
    it('should correctly identify higher roles', () => {
      expect(hasHigherRole('admin', 'manager')).toBe(true)
      expect(hasHigherRole('manager', 'coordinator')).toBe(true)
      expect(hasHigherRole('coordinator', 'installer')).toBe(true)
      expect(hasHigherRole('admin', 'installer')).toBe(true)
      expect(hasHigherRole('installer', 'admin')).toBe(false)
      expect(hasHigherRole('coordinator', 'manager')).toBe(false)
    })

    it('should have correct hierarchy values', () => {
      expect(ROLE_HIERARCHY.admin).toBe(5)
      expect(ROLE_HIERARCHY.manager).toBe(4)
      expect(ROLE_HIERARCHY.coordinator).toBe(3)
      expect(ROLE_HIERARCHY.installer).toBe(2)
      expect(ROLE_HIERARCHY.accountant).toBe(2)
    })
  })

  describe('Permission Functions', () => {
    it('should correctly identify user management access', () => {
      expect(canAccessUserManagement('admin')).toBe(true)
      expect(canAccessUserManagement('manager')).toBe(true)
      expect(canAccessUserManagement('coordinator')).toBe(false)
      expect(canAccessUserManagement('installer')).toBe(false)
      expect(canAccessUserManagement('accountant')).toBe(false)
    })

    it('should correctly identify financial data access', () => {
      expect(canAccessFinancialData('admin')).toBe(true)
      expect(canAccessFinancialData('manager')).toBe(true)
      expect(canAccessFinancialData('accountant')).toBe(true)
      expect(canAccessFinancialData('coordinator')).toBe(false)
      expect(canAccessFinancialData('installer')).toBe(false)
    })

    it('should correctly identify vehicle modification access', () => {
      expect(canModifyVehicles('admin')).toBe(true)
      expect(canModifyVehicles('manager')).toBe(true)
      expect(canModifyVehicles('coordinator')).toBe(true)
      expect(canModifyVehicles('installer')).toBe(false)
      expect(canModifyVehicles('accountant')).toBe(false)
    })

    it('should correctly identify service installation access', () => {
      expect(canInstallServices('admin')).toBe(true)
      expect(canInstallServices('manager')).toBe(true)
      expect(canInstallServices('installer')).toBe(true)
      expect(canInstallServices('coordinator')).toBe(false)
      expect(canInstallServices('accountant')).toBe(false)
    })

    it('should correctly identify report viewing access', () => {
      expect(canViewReports('admin')).toBe(true)
      expect(canViewReports('manager')).toBe(true)
      expect(canViewReports('accountant')).toBe(true)
      expect(canViewReports('coordinator')).toBe(false)
      expect(canViewReports('installer')).toBe(false)
    })

    it('should correctly identify data export access', () => {
      expect(canExportData('admin')).toBe(true)
      expect(canExportData('manager')).toBe(true)
      expect(canExportData('accountant')).toBe(true)
      expect(canExportData('coordinator')).toBe(false)
      expect(canExportData('installer')).toBe(false)
    })
  })

  describe('Work Order Access Control', () => {
    it('should allow admin and manager full access', () => {
      expect(canAccessWorkOrder('admin', 'user123', 'user456')).toBe(true)
      expect(canAccessWorkOrder('manager', 'user123', 'user456')).toBe(true)
    })

    it('should allow installer access only to their own work orders', () => {
      expect(canAccessWorkOrder('installer', 'user123', 'user123')).toBe(true)
      expect(canAccessWorkOrder('installer', 'user123', 'user456')).toBe(false)
    })

    it('should deny access to other roles', () => {
      expect(canAccessWorkOrder('coordinator', 'user123', 'user123')).toBe(false)
      expect(canAccessWorkOrder('accountant', 'user123', 'user123')).toBe(false)
    })
  })

  describe('Service Tracker Access Control', () => {
    it('should allow admin, manager, and coordinator full access', () => {
      expect(canAccessServiceTracker('admin', 'user123', 'user456')).toBe(true)
      expect(canAccessServiceTracker('manager', 'user123', 'user456')).toBe(true)
      expect(canAccessServiceTracker('coordinator', 'user123', 'user456')).toBe(true)
    })

    it('should allow installer access only to their own service trackers', () => {
      expect(canAccessServiceTracker('installer', 'user123', 'user123')).toBe(true)
      expect(canAccessServiceTracker('installer', 'user123', 'user456')).toBe(false)
    })

    it('should deny access to accountant', () => {
      expect(canAccessServiceTracker('accountant', 'user123', 'user123')).toBe(false)
    })
  })

  describe('Navigation Items', () => {
    it('should return all items for admin', () => {
      const adminItems = getNavigationItems('admin')
      expect(adminItems).toHaveLength(6)
      expect(adminItems.map(item => item.title)).toEqual([
        'Dashboard',
        'Vehicle Inward',
        'Vehicles',
        'Trackers',
        'Accounts',
        'Settings'
      ])
    })

    it('should return limited items for installer', () => {
      const installerItems = getNavigationItems('installer')
      expect(installerItems).toHaveLength(2)
      expect(installerItems.map(item => item.title)).toEqual([
        'Dashboard',
        'Vehicles'
      ])
    })

    it('should return appropriate items for accountant', () => {
      const accountantItems = getNavigationItems('accountant')
      expect(accountantItems).toHaveLength(2)
      expect(accountantItems.map(item => item.title)).toEqual([
        'Dashboard',
        'Accounts'
      ])
      expect(accountantItems[1].children).toHaveLength(2)
    })

    it('should return operational items for coordinator', () => {
      const coordinatorItems = getNavigationItems('coordinator')
      expect(coordinatorItems).toHaveLength(4)
      expect(coordinatorItems.map(item => item.title)).toEqual([
        'Dashboard',
        'Vehicle Inward',
        'Vehicles',
        'Trackers'
      ])
    })
  })

  describe('Route Permissions Configuration', () => {
    it('should have correct permissions for dashboard', () => {
      expect(ROUTE_PERMISSIONS['/dashboard']).toEqual([
        'admin', 'manager', 'coordinator', 'installer', 'accountant'
      ])
    })

    it('should have correct permissions for inward', () => {
      expect(ROUTE_PERMISSIONS['/inward']).toEqual([
        'admin', 'manager', 'coordinator'
      ])
    })

    it('should have correct permissions for vehicles', () => {
      expect(ROUTE_PERMISSIONS['/vehicles']).toEqual([
        'admin', 'manager', 'coordinator', 'installer'
      ])
    })

    it('should have correct permissions for accounts', () => {
      expect(ROUTE_PERMISSIONS['/accounts']).toEqual([
        'admin', 'manager', 'accountant'
      ])
    })

    it('should have correct permissions for settings', () => {
      expect(ROUTE_PERMISSIONS['/settings']).toEqual([
        'admin', 'manager'
      ])
    })
  })

  describe('API Route Permissions Configuration', () => {
    it('should have correct permissions for export endpoints', () => {
      expect(API_ROUTE_PERMISSIONS['/api/export/payments']).toEqual([
        'admin', 'manager', 'accountant'
      ])
      expect(API_ROUTE_PERMISSIONS['/api/export/expenses']).toEqual([
        'admin', 'manager', 'accountant'
      ])
      expect(API_ROUTE_PERMISSIONS['/api/export/pnl']).toEqual([
        'admin', 'manager', 'accountant'
      ])
    })

    it('should have correct permissions for vehicle endpoints', () => {
      expect(API_ROUTE_PERMISSIONS['/api/vehicles']).toEqual([
        'admin', 'manager', 'coordinator', 'installer'
      ])
    })

    it('should have correct permissions for work order endpoints', () => {
      expect(API_ROUTE_PERMISSIONS['/api/work-orders']).toEqual([
        'admin', 'manager', 'installer'
      ])
    })
  })

  describe('Edge Cases', () => {
    it('should handle invalid routes gracefully', () => {
      expect(hasRouteAccess('admin', '/invalid-route')).toBe(false)
      expect(hasApiRouteAccess('admin', '/api/invalid-route')).toBe(false)
    })

    it('should handle undefined user roles gracefully', () => {
      expect(() => hasRouteAccess('invalid-role' as UserRole, '/dashboard')).not.toThrow()
      expect(() => hasApiRouteAccess('invalid-role' as UserRole, '/api/vehicles')).not.toThrow()
    })

    it('should handle empty navigation items gracefully', () => {
      const items = getNavigationItems('invalid-role' as UserRole)
      expect(items).toEqual([])
    })
  })
})
