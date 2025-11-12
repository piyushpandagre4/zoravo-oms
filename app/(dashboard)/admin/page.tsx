'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  Mail,
  Phone,
  User,
  Database,
  Key,
  Code,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import Logo from '@/components/Logo'

// Disable static generation - must be exported before component
export const dynamic = 'force-dynamic'

interface Tenant {
  id: string
  name: string
  workspace_url: string
  tenant_code?: string
  is_active: boolean
  is_free: boolean
  subscription_status: string
  trial_ends_at: string | null
  created_at: string
  user_count?: number
  admin?: {
    name: string
    email: string
    phone: string
    id: string
  }
  subscription?: {
    status: string
    amount: number
    billing_period_end: string | null
    billing_period_start: string | null
  }
  payment_proof?: {
    status: string
    created_at: string
    transaction_id: string | null
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      setLoading(true)
      
      // Check if user is super admin (either via super_admins table or RS Car Accessories admin)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      
      // Check if user is in super_admins table
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Check if user is admin in RS Car Accessories tenant
      const { data: rsCarAdmin } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', RS_CAR_ACCESSORIES_TENANT_ID)
        .eq('role', 'admin')
        .single()

      // User must be either super admin or RS Car Accessories admin
      if (!superAdmin && !rsCarAdmin) {
        router.push('/dashboard')
        return
      }

      // Load all tenants with admin details
      const { data: tenantsData, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_users(user_id, role, is_primary_admin),
          subscriptions(status, amount, billing_period_end, billing_period_start),
          tenant_payment_proofs(status, created_at, transaction_id)
        `)
        .order('tenant_code', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading tenants:', error)
        return
      }

      // Get user count separately for each tenant
      const tenantIds = tenantsData?.map((t: any) => t.id) || []
      const userCounts: Record<string, number> = {}
      
      if (tenantIds.length > 0) {
        const { data: userCountData } = await supabase
          .from('tenant_users')
          .select('tenant_id')
          .in('tenant_id', tenantIds)
        
        // Count users per tenant
        userCountData?.forEach((uc: any) => {
          userCounts[uc.tenant_id] = (userCounts[uc.tenant_id] || 0) + 1
        })
      }

      // Fetch admin details for each tenant
      const transformedTenants = await Promise.all(
        (tenantsData || []).map(async (tenant: any) => {
          // Find primary admin - tenant_users might be an array or single object
          const tenantUsersArray = Array.isArray(tenant.tenant_users) 
            ? tenant.tenant_users 
            : tenant.tenant_users ? [tenant.tenant_users] : []
          
          const primaryAdmin = tenantUsersArray.find(
            (tu: any) => tu.is_primary_admin && tu.role === 'admin'
          )

          let adminDetails = null
          if (primaryAdmin) {
            try {
              const adminResponse = await fetch(
                `/api/admin/tenant-details?tenantId=${tenant.id}`
              )
              if (adminResponse.ok) {
                const adminData = await adminResponse.json()
                adminDetails = adminData.admin
              }
            } catch (err) {
              console.error('Error fetching admin details:', err)
            }
          }

          // Get latest payment proof
          const paymentProofs = Array.isArray(tenant.tenant_payment_proofs) 
            ? tenant.tenant_payment_proofs 
            : tenant.tenant_payment_proofs ? [tenant.tenant_payment_proofs] : []
          
          const latestPaymentProof = paymentProofs.length > 0 
            ? paymentProofs.sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
            : null

          return {
            ...tenant,
            user_count: userCounts[tenant.id] || 0,
            subscription: tenant.subscriptions?.[0] || null,
            payment_proof: latestPaymentProof,
            admin: adminDetails
          }
        })
      )

      setTenants(transformedTenants)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tenant.workspace_url.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && tenant.is_active) ||
                         (filterStatus === 'inactive' && !tenant.is_active) ||
                         (filterStatus === 'trial' && tenant.subscription_status === 'trial') ||
                         (filterStatus === 'paid' && tenant.subscription_status === 'active')
    return matchesSearch && matchesFilter
  })

  const toggleTenantExpansion = (tenantId: string) => {
    const newExpanded = new Set(expandedTenants)
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId)
    } else {
      newExpanded.add(tenantId)
    }
    setExpandedTenants(newExpanded)
  }

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.is_active).length,
    trial: tenants.filter(t => t.subscription_status === 'trial').length,
    paid: tenants.filter(t => t.subscription_status === 'active' && !t.is_free).length,
    revenue: tenants
      .filter(t => t.subscription_status === 'active' && !t.is_free)
      .reduce((sum, t) => sum + (t.subscription?.amount || 29), 0)
  }

  const getStatusBadge = (tenant: Tenant) => {
    if (!tenant.is_active) {
      return { label: 'Inactive', color: '#dc2626', bg: '#fef2f2' }
    }
    if (tenant.is_free) {
      return { label: 'Free', color: '#059669', bg: '#d1fae5' }
    }
    if (tenant.subscription_status === 'trial') {
      return { label: 'Trial', color: '#f59e0b', bg: '#fef3c7' }
    }
    if (tenant.subscription_status === 'active') {
      return { label: 'Active', color: '#059669', bg: '#d1fae5' }
    }
    return { label: tenant.subscription_status, color: '#6b7280', bg: '#f3f4f6' }
  }

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null
    const now = new Date().getTime()
    const end = new Date(endDate).getTime()
    const diff = end - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const formatSubscriptionPrice = (amount: number) => {
    // Check if amount is in INR (12000) or USD (29)
    if (amount >= 1000) {
      return `₹${amount.toLocaleString('en-IN')}/year`
    }
    return `$${amount}/month`
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <StatCard
            icon={Building2}
            label="Total Tenants"
            value={stats.total}
            color="#2563eb"
          />
          <StatCard
            icon={CheckCircle}
            label="Active Tenants"
            value={stats.active}
            color="#059669"
          />
          <StatCard
            icon={Clock}
            label="Trial Tenants"
            value={stats.trial}
            color="#f59e0b"
          />
          <StatCard
            icon={DollarSign}
            label="Annual Revenue"
            value={'₹' + (stats.revenue * 12).toLocaleString('en-IN')}
            color="#7c3aed"
          />
        </div>

        {/* Filters and Search */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
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
              placeholder="Search tenants..."
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Tenants Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              Loading tenants...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              No tenants found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Code</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Tenant</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Admin Details</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Users</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Subscription</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Payment Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant, index) => {
                  const statusBadge = getStatusBadge(tenant)
                  return (
                    <React.Fragment key={tenant.id}>
                      <tr style={{ borderBottom: index < filteredTenants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ 
                          fontWeight: '700', 
                          color: '#2563eb', 
                          fontSize: '0.875rem',
                          fontFamily: 'monospace'
                        }}>
                          {tenant.tenant_code || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                          {tenant.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {tenant.workspace_url + '.zoravo.com'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {tenant.admin ? (
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                              {tenant.admin.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>
                              📧 {tenant.admin.email}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>
                              📱 {tenant.admin.phone}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                              ID: {tenant.admin.id.substring(0, 8)}...
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                              ✓ Password Set
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            Loading...
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280' }}>
                        {tenant.user_count || 0}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {tenant.is_free ? (
                          <span style={{ color: '#059669', fontSize: '0.875rem', fontWeight: '500' }}>Free</span>
                        ) : tenant.subscription ? (
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
                              {formatSubscriptionPrice(tenant.subscription.amount)}
                            </div>
                            {tenant.subscription.billing_period_end && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>
                                Ends: {new Date(tenant.subscription.billing_period_end).toLocaleDateString()}
                              </div>
                            )}
                            {tenant.subscription.billing_period_end && (
                              (() => {
                                const daysLeft = calculateDaysRemaining(tenant.subscription.billing_period_end)
                                if (daysLeft !== null) {
                                  if (daysLeft < 0) {
                                    return <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '500' }}>Expired {Math.abs(daysLeft)} days ago</div>
                                  } else if (daysLeft <= 30) {
                                    return <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '500' }}>{daysLeft} days remaining</div>
                                  } else {
                                    return <div style={{ fontSize: '0.75rem', color: '#059669' }}>{daysLeft} days remaining</div>
                                  }
                                }
                                return null
                              })()
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>No subscription</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {tenant.payment_proof ? (
                          <div>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: tenant.payment_proof.status === 'approved' ? '#dcfce7' : tenant.payment_proof.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                              color: tenant.payment_proof.status === 'approved' ? '#166534' : tenant.payment_proof.status === 'rejected' ? '#dc2626' : '#92400e',
                              marginBottom: '0.25rem'
                            }}>
                              {tenant.payment_proof.status === 'approved' ? 'Paid' : tenant.payment_proof.status === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                            {tenant.payment_proof.transaction_id && (
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                Txn: {tenant.payment_proof.transaction_id}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No payment</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: statusBadge.color,
                          backgroundColor: statusBadge.bg
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => toggleTenantExpansion(tenant.id)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title={expandedTenants.has(tenant.id) ? "Hide Details" : "Show Details"}
                        >
                          {expandedTenants.has(tenant.id) ? (
                            <ChevronUp style={{ width: '1rem', height: '1rem' }} />
                          ) : (
                            <ChevronDown style={{ width: '1rem', height: '1rem' }} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedTenants.has(tenant.id) && (
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: index < filteredTenants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <td colSpan={8} style={{ padding: '1.5rem' }}>
                          <div style={{ 
                            backgroundColor: '#1f2937', 
                            borderRadius: '0.5rem', 
                            padding: '1.5rem',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#e5e7eb',
                            overflow: 'auto'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
                              <div>
                                <div style={{ color: '#60a5fa', marginBottom: '0.5rem', fontWeight: '600' }}>
                                  <Database size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                  Tenant Details
                                </div>
                                <div style={{ color: '#9ca3af', lineHeight: '1.8' }}>
                                  <div><span style={{ color: '#fbbf24' }}>ID:</span> {tenant.id}</div>
                                  <div><span style={{ color: '#fbbf24' }}>Code:</span> {tenant.tenant_code || 'N/A'}</div>
                                  <div><span style={{ color: '#fbbf24' }}>Active:</span> {tenant.is_active ? '✓' : '✗'}</div>
                                  <div><span style={{ color: '#fbbf24' }}>Free:</span> {tenant.is_free ? '✓' : '✗'}</div>
                                  <div><span style={{ color: '#fbbf24' }}>Status:</span> {tenant.subscription_status}</div>
                                  {tenant.trial_ends_at && (
                                    <div><span style={{ color: '#fbbf24' }}>Trial Ends:</span> {new Date(tenant.trial_ends_at).toISOString()}</div>
                                  )}
                                </div>
                              </div>
                              
                              {tenant.subscription && (
                                <div>
                                  <div style={{ color: '#60a5fa', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    <DollarSign size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                    Subscription
                                  </div>
                                  <div style={{ color: '#9ca3af', lineHeight: '1.8' }}>
                                    <div><span style={{ color: '#fbbf24' }}>Status:</span> {tenant.subscription.status}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Amount:</span> ₹{tenant.subscription.amount?.toLocaleString('en-IN') || 'N/A'}</div>
                                    {tenant.subscription.billing_period_start && (
                                      <div><span style={{ color: '#fbbf24' }}>Start:</span> {new Date(tenant.subscription.billing_period_start).toISOString()}</div>
                                    )}
                                    {tenant.subscription.billing_period_end && (
                                      <div><span style={{ color: '#fbbf24' }}>End:</span> {new Date(tenant.subscription.billing_period_end).toISOString()}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {tenant.payment_proof && (
                                <div>
                                  <div style={{ color: '#60a5fa', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                    Payment Proof
                                  </div>
                                  <div style={{ color: '#9ca3af', lineHeight: '1.8' }}>
                                    <div><span style={{ color: '#fbbf24' }}>Status:</span> {tenant.payment_proof.status}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Txn ID:</span> {tenant.payment_proof.transaction_id || 'N/A'}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Created:</span> {new Date(tenant.payment_proof.created_at).toISOString()}</div>
                                  </div>
                                </div>
                              )}
                              
                              <div>
                                <div style={{ color: '#60a5fa', marginBottom: '0.5rem', fontWeight: '600' }}>
                                  <Key size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                  API Info
                                </div>
                                <div style={{ color: '#9ca3af', lineHeight: '1.8' }}>
                                  <div><span style={{ color: '#fbbf24' }}>Workspace:</span> {tenant.workspace_url}</div>
                                  <div><span style={{ color: '#fbbf24' }}>URL:</span> https://{tenant.workspace_url}.zoravo.com</div>
                                  <div><span style={{ color: '#fbbf24' }}>Users:</span> {tenant.user_count || 0}</div>
                                  <div><span style={{ color: '#fbbf24' }}>Created:</span> {new Date(tenant.created_at).toISOString()}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #374151' }}>
                              <div style={{ color: '#60a5fa', marginBottom: '0.5rem', fontWeight: '600' }}>
                                <Code size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Raw JSON
                              </div>
                              <pre style={{ 
                                margin: 0, 
                                padding: '1rem', 
                                backgroundColor: '#111827', 
                                borderRadius: '0.375rem',
                                overflow: 'auto',
                                maxHeight: '300px',
                                fontSize: '0.7rem',
                                lineHeight: '1.5'
                              }}>
                                {JSON.stringify(tenant, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.5rem',
          backgroundColor: color + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon style={{ width: '1.25rem', height: '1.25rem', color }} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        {label}
      </div>
    </div>
  )
}

