'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  Search,
  Filter,
  Plus,
  Mail,
  Code,
  Eye,
  ChevronDown,
  ChevronUp,
  Database,
  Key,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  workspace_url: string
  is_active: boolean
  is_free: boolean
  subscription_status: string
  trial_ends_at: string | null
  created_at: string
  user_count?: number
  subscription?: {
    status: string
    amount: number
    billing_period_end: string | null
  }
  payment_proof?: {
    status: string
    created_at: string
    transaction_id: string | null
  }
}

// Disable static generation - must be exported before component
export const dynamic = 'force-dynamic'

export default function TenantsManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [developerView, setDeveloperView] = useState(false)
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadTenants()
  }, [])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const { data: tenantsData, error } = await supabase
        .from('tenants')
        .select(`
          *,
          subscriptions(id, status, amount, currency, billing_period_start, billing_period_end, plan_name, created_at),
          tenant_payment_proofs(id, status, created_at, transaction_id, payment_date, amount, currency, reviewed_at)
        `)
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

      const transformedTenants = tenantsData?.map((tenant: any) => {
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
          payment_proof: latestPaymentProof
        }
      }) || []

      setTenants(transformedTenants)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const isPaid = (tenant: Tenant) => {
    // Consider paid if:
    // 1. Has approved payment proof, OR
    // 2. Has active subscription with billing period not expired, OR
    // 3. Is free tier (always considered "paid" in terms of access)
    if (tenant.is_free) return true
    if (tenant.payment_proof?.status === 'approved') return true
    if (tenant.subscription?.status === 'active') {
      if (tenant.subscription.billing_period_end) {
        const endDate = new Date(tenant.subscription.billing_period_end)
        return endDate > new Date()
      }
      return true
    }
    return false
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tenant.workspace_url.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (filterStatus === 'all') {
      return matchesSearch
    }
    
    const paid = isPaid(tenant)
    const active = tenant.is_active
    
    const matchesFilter = 
      (filterStatus === 'paid-active' && paid && active) ||
      (filterStatus === 'paid-inactive' && paid && !active) ||
      (filterStatus === 'unpaid-active' && !paid && active) ||
      (filterStatus === 'unpaid-inactive' && !paid && !active) ||
      (filterStatus === 'active' && active) ||
      (filterStatus === 'inactive' && !active) ||
      (filterStatus === 'trial' && tenant.subscription_status === 'trial') ||
      (filterStatus === 'paid' && paid) ||
      (filterStatus === 'unpaid' && !paid)
    
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (tenant: Tenant) => {
    const paid = isPaid(tenant)
    const active = tenant.is_active
    const hasPaymentProof = !!tenant.payment_proof
    const paymentProofStatus = tenant.payment_proof?.status
    
    // Workflow-based status determination
    // 1. Free tier - always active
    if (tenant.is_free) {
      return { label: 'Free', color: '#059669', bg: '#d1fae5', description: 'Free tier tenant' }
    }
    
    // 2. Trial period - check if trial is active or expired
    if (tenant.subscription_status === 'trial') {
      if (tenant.trial_ends_at) {
        const trialEnd = new Date(tenant.trial_ends_at)
        const now = new Date()
        if (trialEnd > now) {
          const hoursLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60))
          return { label: 'Trial', color: '#f59e0b', bg: '#fef3c7', description: `Trial active (${hoursLeft}h left)` }
        } else {
          return { label: 'Trial Expired', color: '#dc2626', bg: '#fef2f2', description: 'Trial period ended' }
        }
      }
      return { label: 'Trial', color: '#f59e0b', bg: '#fef3c7', description: 'Trial period' }
    }
    
    // 3. Payment proof workflow states
    if (hasPaymentProof) {
      if (paymentProofStatus === 'pending') {
        return { label: 'Payment Pending', color: '#f59e0b', bg: '#fef3c7', description: 'Awaiting payment approval' }
      }
      if (paymentProofStatus === 'rejected') {
        return { label: 'Payment Rejected', color: '#dc2626', bg: '#fef2f2', description: 'Payment proof rejected' }
      }
      if (paymentProofStatus === 'approved' && !tenant.subscription) {
        return { label: 'Approved - No Subscription', color: '#f59e0b', bg: '#fef3c7', description: 'Payment approved but subscription missing' }
      }
    }
    
    // 4. Subscription states
    if (tenant.subscription) {
      const subscription = tenant.subscription
      if (subscription.billing_period_end) {
        const endDate = new Date(subscription.billing_period_end)
        const now = new Date()
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysLeft < 0) {
          return { label: 'Subscription Expired', color: '#dc2626', bg: '#fef2f2', description: `Expired ${Math.abs(daysLeft)} days ago` }
        }
        if (daysLeft <= 30) {
          return { label: 'Expiring Soon', color: '#f59e0b', bg: '#fef3c7', description: `${daysLeft} days remaining` }
        }
      }
      
      if (subscription.status === 'active' && active) {
        return { label: 'Active', color: '#059669', bg: '#d1fae5', description: 'Subscription active' }
      }
      if (subscription.status === 'active' && !active) {
        return { label: 'Suspended', color: '#f59e0b', bg: '#fef3c7', description: 'Subscription active but tenant inactive' }
      }
    }
    
    // 5. Combined payment and active state
    if (paid && active) {
      return { label: 'Active', color: '#059669', bg: '#d1fae5', description: 'Paid and active' }
    }
    if (paid && !active) {
      return { label: 'Inactive', color: '#6b7280', bg: '#f3f4f6', description: 'Paid but inactive' }
    }
    if (!paid && active) {
      return { label: 'Unpaid', color: '#dc2626', bg: '#fef2f2', description: 'Active but unpaid' }
    }
    if (!paid && !active) {
      return { label: 'Inactive', color: '#991b1b', bg: '#fee2e2', description: 'Unpaid and inactive' }
    }
    
    return { label: tenant.subscription_status || 'Unknown', color: '#6b7280', bg: '#f3f4f6', description: 'Status unknown' }
  }

  const toggleTenantExpansion = (tenantId: string) => {
    const newExpanded = new Set(expandedTenants)
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId)
    } else {
      newExpanded.add(tenantId)
    }
    setExpandedTenants(newExpanded)
  }

  const handleToggleActive = async (tenant: Tenant) => {
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id)

    if (!error) {
      loadTenants()
    }
  }

  const handleSendWelcomeEmail = async (tenant: Tenant) => {
    if (!confirm(`Send welcome email to ${tenant.name}?`)) {
      return
    }

    try {
      setSendingEmail(tenant.id)
      const response = await fetch('/api/admin/send-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: tenant.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to send email'
        throw new Error(errorMessage)
      }

      alert('Welcome email sent successfully!')
    } catch (error: any) {
      console.error('Error sending email:', error)
      alert('Failed to send email: ' + error.message)
    } finally {
      setSendingEmail(null)
    }
  }

  const handleSendWelcomeEmailToAll = async () => {
    const tenantCount = filteredTenants.length
    if (tenantCount === 0) {
      alert('No tenants to send emails to')
      return
    }

    if (!confirm(`Send welcome email to all ${tenantCount} tenant(s)?`)) {
      return
    }

    try {
      setSendingEmail('all')
      let successCount = 0
      let failCount = 0

      for (const tenant of filteredTenants) {
        try {
          const response = await fetch('/api/admin/send-welcome-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tenantId: tenant.id }),
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
          console.error(`Error sending email to ${tenant.name}:`, error)
        }
      }

      alert(`Welcome emails sent! Success: ${successCount}, Failed: ${failCount}`)
    } catch (error: any) {
      console.error('Error sending emails:', error)
      alert('Failed to send some emails: ' + error.message)
    } finally {
      setSendingEmail(null)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 0.5rem 0'
        }}>
          Tenant Management
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Manage all tenants, workspaces, and their configurations
        </p>
      </div>

      {/* Actions Bar */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        border: '1px solid #e5e7eb'
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
          <option value="paid-active">Paid-Active</option>
          <option value="paid-inactive">Paid-Inactive</option>
          <option value="unpaid-active">Unpaid-Active</option>
          <option value="unpaid-inactive">Unpaid-Inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="trial">Trial</option>
        </select>
        <button
          onClick={() => setDeveloperView(!developerView)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: developerView ? '#059669' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          title="Toggle Developer View"
        >
          <Code style={{ width: '1rem', height: '1rem' }} />
          {developerView ? 'Normal View' : 'Developer View'}
        </button>
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
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Tenant</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Workspace</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Users</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Subscription</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant, index) => {
                const statusBadge = getStatusBadge(tenant)
                const isExpanded = expandedTenants.has(tenant.id)
                const showDevDetails = developerView && isExpanded
                
                return (
                  <React.Fragment key={tenant.id}>
                    <tr style={{ borderBottom: index < filteredTenants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {developerView && (
                            <button
                              onClick={() => toggleTenantExpansion(tenant.id)}
                              style={{
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                          <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                        {tenant.name}
                            </div>
                            {developerView && (
                              <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                                ID: {tenant.id.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {tenant.workspace_url + '.zoravo.com'}
                      </div>
                        {developerView && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                            {tenant.workspace_url}
                          </div>
                        )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: statusBadge.color,
                            backgroundColor: statusBadge.bg,
                            width: 'fit-content'
                      }}>
                        {statusBadge.label}
                      </span>
                          {developerView && statusBadge.description && (
                            <div style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic' }}>
                              {statusBadge.description}
                            </div>
                          )}
                        </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {tenant.user_count || 0}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {tenant.is_free ? (
                        <span style={{ color: '#059669', fontSize: '0.875rem' }}>Free</span>
                      ) : tenant.subscription ? (
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                              {tenant.subscription.amount >= 1000 
                                ? `₹${tenant.subscription.amount.toLocaleString('en-IN')}/year`
                                : `₹${tenant.subscription.amount.toLocaleString('en-IN')}/month`}
                          </div>
                          {tenant.subscription.billing_period_end && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                              Until {new Date(tenant.subscription.billing_period_end).toLocaleDateString()}
                            </div>
                          )}
                            {developerView && tenant.subscription.id && (
                              <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                                Sub: {tenant.subscription.id.substring(0, 8)}...
                              </div>
                            )}
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>No subscription</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      </td>
                    </tr>
                    {showDevDetails && (
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: index < filteredTenants.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <td colSpan={7} style={{ padding: '1.5rem' }}>
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
                                  <div><span style={{ color: '#fbbf24' }}>Code:</span> {(tenant as any).tenant_code || 'N/A'}</div>
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
                                    <div><span style={{ color: '#fbbf24' }}>ID:</span> {tenant.subscription.id}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Status:</span> {tenant.subscription.status}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Plan:</span> {(tenant.subscription as any).plan_name || 'N/A'}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Amount:</span> {tenant.subscription.amount} {(tenant.subscription as any).currency || 'INR'}</div>
                                    {(tenant.subscription as any).billing_period_start && (
                                      <div><span style={{ color: '#fbbf24' }}>Start:</span> {new Date((tenant.subscription as any).billing_period_start).toISOString()}</div>
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
                                    <div><span style={{ color: '#fbbf24' }}>ID:</span> {tenant.payment_proof.id}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Status:</span> {tenant.payment_proof.status}</div>
                                    <div><span style={{ color: '#fbbf24' }}>Txn ID:</span> {tenant.payment_proof.transaction_id || 'N/A'}</div>
                                    {(tenant.payment_proof as any).amount && (
                                      <div><span style={{ color: '#fbbf24' }}>Amount:</span> {(tenant.payment_proof as any).amount} {(tenant.payment_proof as any).currency || 'INR'}</div>
                                    )}
                                    {(tenant.payment_proof as any).payment_date && (
                                      <div><span style={{ color: '#fbbf24' }}>Date:</span> {new Date((tenant.payment_proof as any).payment_date).toISOString()}</div>
                                    )}
                                    <div><span style={{ color: '#fbbf24' }}>Created:</span> {new Date(tenant.payment_proof.created_at).toISOString()}</div>
                                    {(tenant.payment_proof as any).reviewed_at && (
                                      <div><span style={{ color: '#fbbf24' }}>Reviewed:</span> {new Date((tenant.payment_proof as any).reviewed_at).toISOString()}</div>
                                    )}
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

