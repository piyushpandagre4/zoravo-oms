'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Search,
  Building2,
  Mail,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  phone: string
  tenant_id: string
  tenant_name: string
  tenant_code?: string
  workspace_url: string
  is_super_admin: boolean
}

// Disable static generation - must be exported before component
export const dynamic = 'force-dynamic'

export default function UsersManagementPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Get all tenant_users with tenant info and is_primary_admin
      const { data: tenantUsers, error: tenantUsersError } = await supabase
        .from('tenant_users')
        .select(`
          user_id,
          role,
          is_primary_admin,
          tenants(id, name, workspace_url, tenant_code)
        `)

      if (tenantUsersError) {
        console.error('Error loading tenant users:', tenantUsersError)
        return
      }

      // Get all super admins
      const { data: superAdmins, error: superAdminsError } = await supabase
        .from('super_admins')
        .select('user_id')

      if (superAdminsError) {
        console.error('Error loading super admins:', superAdminsError)
        return
      }

      const superAdminIds = new Set(superAdmins?.map(sa => sa.user_id) || [])

      // Group by tenant_id to show tenant admins
      const tenantsMap = new Map<string, any>()
      
      tenantUsers?.forEach((tu: any) => {
        if (tu.is_primary_admin && tu.role === 'admin') {
          if (!tenantsMap.has(tu.tenants.id)) {
            tenantsMap.set(tu.tenants.id, {
              tenant_id: tu.tenants.id,
              tenant_name: tu.tenants.name,
              tenant_code: tu.tenants.tenant_code,
              workspace_url: tu.tenants.workspace_url,
              admin_user_id: tu.user_id,
              admin_role: tu.role
            })
          }
        }
      })

      // Fetch admin details for each tenant
      const usersList = await Promise.all(
        Array.from(tenantsMap.values()).map(async (tenant: any) => {
          try {
            const adminResponse = await fetch(
              `/api/admin/tenant-details?tenantId=${tenant.tenant_id}`
            )
            if (adminResponse.ok) {
              const adminData = await adminResponse.json()
              return {
                id: tenant.admin_user_id,
                email: adminData.admin.email,
                name: adminData.admin.name,
                phone: adminData.admin.phone,
                tenant_id: tenant.tenant_id,
                tenant_name: tenant.tenant_name,
                tenant_code: tenant.tenant_code,
                workspace_url: tenant.workspace_url,
                is_super_admin: false
              }
            }
          } catch (err) {
            console.error('Error fetching admin details:', err)
          }
          return {
            id: tenant.admin_user_id,
            email: '',
            name: '',
            phone: '',
            tenant_id: tenant.tenant_id,
            tenant_name: tenant.tenant_name,
            tenant_code: tenant.tenant_code,
            workspace_url: tenant.workspace_url,
            is_super_admin: false
          }
        })
      )

      setUsers(usersList.filter(u => u !== null))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.tenant_code && user.tenant_code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 0.5rem 0'
        }}>
          User Management
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Manage users across all tenants and workspaces
        </p>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '1rem',
            height: '1rem',
            color: '#9ca3af'
          }} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        border: '1px solid #e5e7eb'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            No users found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Tenant</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Admin Details</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>User ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Password</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} style={{ borderBottom: index < filteredUsers.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                      {user.tenant_name}
                    </div>
                    {user.tenant_code && (
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace', fontWeight: '600', marginBottom: '0.125rem' }}>
                        {user.tenant_code}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {user.workspace_url}.zoravo.in
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                        {user.name || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>
                        📧 {user.email || 'N/A'}
                      </div>
                      {user.phone && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          📱 {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {user.id}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <UserCheck style={{ width: '0.875rem', height: '0.875rem' }} />
                      Password Set
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      (Hashed for security)
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

