'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Eye,
  Trash2,
  Power,
  PowerOff,
  Calendar,
  FileText,
  Building2
} from 'lucide-react'

interface PaymentProof {
  id: string
  tenant_id: string
  transaction_id: string | null
  payment_date: string | null
  amount: number
  currency: string
  status: string
  created_at: string
  notes: string | null
  payment_proof_url: string | null
}

interface SubscriptionPlanRequest {
  id: string
  tenant_id: string
  plan_name: string
  plan_display_name: string
  amount: number
  currency: string
  billing_cycle: string
  status: string
  requested_at: string
  rejection_reason?: string | null
}

interface TenantSubscription {
  id: string
  tenant_id: string
  tenant_name: string
  tenant_code: string | null
  subscription_status: string
  is_active: boolean
  trial_ends_at: string | null
  subscription?: {
    id: string
    status: string
    amount: number
    billing_period_start: string | null
    billing_period_end: string | null
  }
  payment_proofs: PaymentProof[]
  plan_request?: SubscriptionPlanRequest | null
  admin?: {
    name: string
    email: string
    phone: string
  }
}

export default function SubscriptionManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    loadSubscriptions()
  }, [])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)

      // Check if user is super admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (!superAdmin) {
        router.push('/dashboard')
        return
      }

      // Load all tenants with subscriptions and payment proofs
      const { data: tenantsData, error } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          tenant_code,
          subscription_status,
          is_active,
          trial_ends_at,
          subscriptions(id, status, amount, billing_period_start, billing_period_end),
          tenant_payment_proofs(id, transaction_id, payment_date, amount, currency, status, created_at, notes, payment_proof_url)
        `)
        .order('created_at', { ascending: false })

      // Fetch subscription plan requests for each tenant
      const { data: planRequests } = await supabase
        .from('subscription_plan_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Error loading subscriptions:', error)
        return
      }

      // Create a map of tenant_id to plan request
      const planRequestsMap = new Map<string, any>()
      planRequests?.forEach((req: any) => {
        planRequestsMap.set(req.tenant_id, req)
      })

      // Fetch admin details for each tenant
      const transformedSubscriptions = await Promise.all(
        (tenantsData || []).map(async (tenant: any) => {
          let adminDetails = null
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

          const paymentProofs = Array.isArray(tenant.tenant_payment_proofs)
            ? tenant.tenant_payment_proofs
            : tenant.tenant_payment_proofs ? [tenant.tenant_payment_proofs] : []

          return {
            id: tenant.id,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            tenant_code: tenant.tenant_code,
            subscription_status: tenant.subscription_status,
            is_active: tenant.is_active,
            trial_ends_at: tenant.trial_ends_at,
            subscription: tenant.subscriptions?.[0] || null,
            payment_proofs: paymentProofs.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            plan_request: planRequestsMap.get(tenant.id) || null,
            admin: adminDetails
          }
        })
      )

      setSubscriptions(transformedSubscriptions)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null
    const now = new Date().getTime()
    const end = new Date(endDate).getTime()
    const diff = end - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const calculateTrialTimeRemaining = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null
    const now = new Date().getTime()
    const end = new Date(trialEndsAt).getTime()
    const diff = end - now
    
    if (diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, totalMinutes: 0 }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const totalMinutes = Math.floor(diff / (1000 * 60))
    
    return { expired: false, days, hours, minutes, totalMinutes }
  }

  const calculateSubscriptionEndDate = (startDate: string | null) => {
    if (!startDate) return null
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 365) // Add 365 days
    return end.toISOString()
  }

  const handleApplySubscriptionPlan = async (tenantId: string, planRequest: SubscriptionPlanRequest, proofId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Approve payment proof if provided
      if (proofId) {
        await supabase
          .from('tenant_payment_proofs')
          .update({
            status: 'approved',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', proofId)
      }

      // Get payment date (from proof or use today)
      let paymentDate = new Date().toISOString().split('T')[0]
      if (proofId) {
        const { data: paymentProof } = await supabase
          .from('tenant_payment_proofs')
          .select('payment_date')
          .eq('id', proofId)
          .single()
        if (paymentProof?.payment_date) {
          paymentDate = paymentProof.payment_date
        }
      }

      const startDate = new Date(paymentDate)
      let endDate = new Date(startDate)
      
      // Calculate end date based on billing cycle
      if (planRequest.billing_cycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1)
      } else if (planRequest.billing_cycle === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3)
      } else if (planRequest.billing_cycle === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        // Default to 365 days
        endDate.setDate(endDate.getDate() + 365)
      }

      // Update or create subscription with plan details
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

      if (existingSubscription) {
        await supabase
          .from('subscriptions')
          .update({
            plan_name: planRequest.plan_name,
            amount: planRequest.amount,
            currency: planRequest.currency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
          .eq('id', existingSubscription.id)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            plan_name: planRequest.plan_name,
            amount: planRequest.amount,
            currency: planRequest.currency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
      }

      // Mark plan request as approved
      await supabase
        .from('subscription_plan_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', planRequest.id)

      // Activate tenant
      await supabase
        .from('tenants')
        .update({
          is_active: true,
          subscription_status: 'active'
        })
        .eq('id', tenantId)

      alert('Subscription plan applied successfully! Tenant activated with all features.')
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error applying subscription plan:', error)
      alert('Failed to apply subscription plan: ' + error.message)
    }
  }

  const handlePaymentCollected = async (tenantId: string, proofId: string | null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // If there's a payment proof, approve it first
      if (proofId) {
        await supabase
          .from('tenant_payment_proofs')
          .update({
            status: 'approved',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', proofId)
      }

      // Get payment date (from proof or use today)
      let paymentDate = new Date().toISOString().split('T')[0]
      if (proofId) {
        const { data: paymentProof } = await supabase
          .from('tenant_payment_proofs')
          .select('payment_date')
          .eq('id', proofId)
          .single()
        if (paymentProof?.payment_date) {
          paymentDate = paymentProof.payment_date
        }
      }

      const startDate = new Date(paymentDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 365) // Add 365 days

      // Update or create subscription
      // Always set to annual plan: ₹12,000/year
      const annualPlanAmount = 12000.00
      const annualPlanCurrency = 'INR'
      
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

      if (existingSubscription) {
        await supabase
          .from('subscriptions')
          .update({
            plan_name: 'annual',
            amount: annualPlanAmount,
            currency: annualPlanCurrency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
          .eq('id', existingSubscription.id)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            plan_name: 'annual',
            amount: annualPlanAmount,
            currency: annualPlanCurrency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
      }

      // Activate tenant and clear trial period (payment collected = subscription active)
      await supabase
        .from('tenants')
        .update({
          is_active: true,
          subscription_status: 'active',
          trial_ends_at: null // Clear trial period as payment is collected
        })
        .eq('id', tenantId)

      alert('Payment confirmed! Tenant activated for 365 days.')
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      alert('Failed to confirm payment: ' + error.message)
    }
  }

  const handleApprovePayment = async (proofId: string, tenantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update payment proof status
      const { error: proofError } = await supabase
        .from('tenant_payment_proofs')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', proofId)

      if (proofError) throw proofError

      // Get the payment proof to get payment date
      const { data: paymentProof } = await supabase
        .from('tenant_payment_proofs')
        .select('payment_date, created_at')
        .eq('id', proofId)
        .single()

      // Use payment date if available, otherwise use approval date (today)
      // Subscription starts from payment date, expires 365 days later
      const paymentDate = paymentProof?.payment_date 
        ? new Date(paymentProof.payment_date)
        : new Date() // If no payment date, use today (approval date)
      
      // Calculate subscription period: 365 days from payment date
      const startDate = new Date(paymentDate)
      startDate.setHours(0, 0, 0, 0) // Start of payment date
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 365) // Add exactly 365 days for annual subscription
      endDate.setHours(23, 59, 59, 999) // End of expiry date

      // Always set to annual plan: ₹12,000/year
      const annualPlanAmount = 12000.00
      const annualPlanCurrency = 'INR'
      
      // Update subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .single()

      if (existingSubscription) {
        await supabase
          .from('subscriptions')
          .update({
            plan_name: 'annual',
            amount: annualPlanAmount,
            currency: annualPlanCurrency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
          .eq('id', existingSubscription.id)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            plan_name: 'annual',
            amount: annualPlanAmount,
            currency: annualPlanCurrency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
      }

      // Activate tenant and clear trial period (payment approved = subscription active)
      await supabase
        .from('tenants')
        .update({
          is_active: true,
          subscription_status: 'active',
          trial_ends_at: null // Clear trial period as payment is approved
        })
        .eq('id', tenantId)

      alert('Payment approved and tenant activated! Subscription active for 365 days.')
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error approving payment:', error)
      alert('Failed to approve payment: ' + error.message)
    }
  }

  const handleRejectPayment = async (proofId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const reason = prompt('Enter rejection reason:')
      if (!reason) return

      await supabase
        .from('tenant_payment_proofs')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', proofId)

      alert('Payment rejected!')
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error rejecting payment:', error)
      alert('Failed to reject payment: ' + error.message)
    }
  }

  const handleActivateTenant = async (tenantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate subscription period: 365 days from today
      const startDate = new Date()
      startDate.setHours(0, 0, 0, 0) // Start of today
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 365) // Add exactly 365 days for annual subscription
      endDate.setHours(23, 59, 59, 999) // End of expiry date

      // Always set to annual plan: ₹12,000/year
      const annualPlanAmount = 12000.00
      const annualPlanCurrency = 'INR'
      
      // Update or create subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (existingSubscription) {
        await supabase
          .from('subscriptions')
          .update({
            plan_name: 'annual',
            amount: annualPlanAmount,
            currency: annualPlanCurrency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
          .eq('id', existingSubscription.id)
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            plan_name: 'annual',
            amount: annualPlanAmount,
            currency: annualPlanCurrency,
            status: 'active',
            billing_period_start: startDate.toISOString(),
            billing_period_end: endDate.toISOString()
          })
      }

      // Activate tenant and clear trial period (payment collected = subscription active)
      await supabase
        .from('tenants')
        .update({
          is_active: true,
          subscription_status: 'active',
          trial_ends_at: null // Clear trial period as payment is collected
        })
        .eq('id', tenantId)

      alert('✅ Tenant activated! Subscription set for 365 days from today.')
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error activating tenant:', error)
      alert('Failed to activate tenant: ' + error.message)
    }
  }

  const handleToggleActive = async (tenantId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      
      // Call API endpoint that uses admin client to bypass RLS
      const response = await fetch('/api/admin/toggle-tenant-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          isActive: newStatus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tenant status')
      }

      alert(`✅ Tenant ${newStatus ? 'activated' : 'deactivated'}!`)
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error toggling tenant status:', error)
      alert(`Failed to ${!currentStatus ? 'activate' : 'deactivate'} tenant: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDeleteTenant = async (tenantId: string, tenantName: string, tenantCode: string) => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete:\n\n` +
      `• Tenant: ${tenantName} (${tenantCode})\n` +
      `• All users associated with this tenant\n` +
      `• All customers, vehicles, invoices, and work orders\n` +
      `• All subscriptions and payment proofs\n` +
      `• All settings, locations, and configurations\n` +
      `• All files and attachments\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type "DELETE" to confirm:`
    
    const userInput = prompt(confirmMessage)
    if (userInput !== 'DELETE') {
      return
    }

    try {
      setLoading(true)
      
      // Call the comprehensive delete API
      const response = await fetch(`/api/admin/delete-tenant?tenantId=${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tenant')
      }

      alert(`✅ ${data.message || 'Tenant and all associated data deleted successfully!'}`)
      loadSubscriptions()
    } catch (error: any) {
      console.error('Error deleting tenant:', error)
      alert('❌ Failed to delete tenant: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sub.tenant_code && sub.tenant_code.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'pending' && sub.payment_proofs.some(p => p.status === 'pending')) ||
                         (filterStatus === 'active' && sub.is_active) ||
                         (filterStatus === 'inactive' && !sub.is_active) ||
                         (filterStatus === 'expired' && sub.subscription && calculateDaysRemaining(sub.subscription.billing_period_end) !== null && calculateDaysRemaining(sub.subscription.billing_period_end)! < 0)
    return matchesSearch && matchesFilter
  })

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '800',
          color: '#111827',
          margin: '0 0 0.75rem 0',
          letterSpacing: '-0.025em'
        }}>
          Subscription Management
        </h1>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem', lineHeight: '1.6' }}>
          Manage tenant subscriptions, payment proofs, and account status
        </p>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.75rem',
        borderRadius: '0.75rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '1.125rem',
            height: '1.125rem',
            color: '#9ca3af',
            pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Search tenants by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem 0.875rem 2.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.9375rem',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.875rem 1.25rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            backgroundColor: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none',
            fontWeight: '500'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Payments</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Subscriptions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            Loading subscriptions...
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
            No subscriptions found
          </div>
        ) : (
          filteredSubscriptions.map((sub) => {
            const daysLeft = sub.subscription?.billing_period_end
              ? calculateDaysRemaining(sub.subscription.billing_period_end)
              : null
            const trialTime = calculateTrialTimeRemaining(sub.trial_ends_at)
            const pendingProofs = sub.payment_proofs.filter(p => p.status === 'pending')
            const latestProof = sub.payment_proofs[0] || null
            const approvedProof = sub.payment_proofs.find(p => p.status === 'approved')

                return (
              <div
                key={sub.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.875rem',
                  padding: '2rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  marginBottom: '1.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  e.currentTarget.style.borderColor = '#d1d5db'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Building2 style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
                        {sub.tenant_name}
                      </h3>
                      {sub.tenant_code && (
                        <span style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.8125rem',
                          fontWeight: '700',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                          border: '1px solid #bfdbfe'
                        }}>
                          {sub.tenant_code}
                        </span>
                      )}
                    </div>
                    {sub.admin && (
                      <div style={{ fontSize: '0.9375rem', color: '#6b7280', marginLeft: '3.375rem', fontWeight: '500' }}>
                        Admin: <span style={{ color: '#374151', fontWeight: '600' }}>{sub.admin.name}</span> ({sub.admin.email})
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {pendingProofs.length > 0 && (
                      <button
                        onClick={() => handlePaymentCollected(sub.tenant_id, pendingProofs[0].id)}
                        style={{
                          padding: '0.625rem 1.25rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: '#059669',
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#047857'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(5, 150, 105, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)'
                        }}
                      >
                        <CheckCircle style={{ width: '1.125rem', height: '1.125rem' }} />
                        Payment Collected
                      </button>
                    )}
                    {!sub.is_active && (
                      <button
                        onClick={() => handleActivateTenant(sub.tenant_id)}
                        style={{
                          padding: '0.625rem 1.25rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          border: '1px solid #86efac',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: '#dcfce7',
                          color: '#059669',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#bbf7d0'
                          e.currentTarget.style.borderColor = '#4ade80'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#dcfce7'
                          e.currentTarget.style.borderColor = '#86efac'
                        }}
                      >
                        <CheckCircle style={{ width: '1.125rem', height: '1.125rem' }} />
                        Activate
                      </button>
                    )}
                    {sub.is_active && (
                      <button
                        onClick={() => handleToggleActive(sub.tenant_id, sub.is_active)}
                        style={{
                          padding: '0.625rem 1.25rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          border: '1px solid #fecaca',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fee2e2'
                          e.currentTarget.style.borderColor = '#fca5a5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fef2f2'
                          e.currentTarget.style.borderColor = '#fecaca'
                        }}
                      >
                        <PowerOff style={{ width: '1.125rem', height: '1.125rem' }} />
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTenant(sub.tenant_id, sub.tenant_name, sub.tenant_code || '')}
                      style={{
                        padding: '0.625rem 1.25rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2'
                        e.currentTarget.style.borderColor = '#fca5a5'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2'
                        e.currentTarget.style.borderColor = '#fecaca'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <Trash2 style={{ width: '1.125rem', height: '1.125rem' }} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Trial Period Information - Only show if payment not approved and subscription not active */}
                {trialTime && !approvedProof && (!sub.subscription || sub.subscription.status !== 'active') && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: trialTime.expired ? '#fef2f2' : '#fef3c7',
                    border: `1px solid ${trialTime.expired ? '#fecaca' : '#fcd34d'}`,
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <Clock style={{ width: '1rem', height: '1rem', color: trialTime.expired ? '#dc2626' : '#f59e0b' }} />
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: trialTime.expired ? '#dc2626' : '#92400e' }}>
                        {trialTime.expired ? 'Trial Period Expired' : 'Trial Period Remaining'}
                      </div>
                    </div>
                    {trialTime.expired ? (
                      <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                        Trial ended on {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleString() : 'N/A'}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                        <strong>{trialTime.days} days, {trialTime.hours} hours, {trialTime.minutes} minutes</strong> remaining
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          Trial ends: {sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subscription Expiry - Show when payment approved and subscription active */}
                {approvedProof && sub.subscription && sub.subscription.status === 'active' && sub.subscription.billing_period_end && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <CheckCircle style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534' }}>
                        Subscription Active
                      </div>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Expiry Date:</strong> {new Date(sub.subscription.billing_period_end).toLocaleDateString()}
                      </div>
                      {daysLeft !== null && (
                        <div style={{ 
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: daysLeft < 0 ? '#dc2626' : daysLeft <= 30 ? '#f59e0b' : '#059669'
                        }}>
                          {daysLeft < 0 
                            ? `Expired ${Math.abs(daysLeft)} days ago` 
                            : `${daysLeft} days remaining`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Plan Requested */}
                {sub.plan_request && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem' }}>
                      📋 Plan Requested
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Plan Name</div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>{sub.plan_request.plan_display_name}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Amount</div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>
                          {sub.plan_request.currency === 'INR' ? '₹' : '$'}{sub.plan_request.amount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Billing Cycle</div>
                        <div style={{ fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' }}>
                          {sub.plan_request.billing_cycle}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Requested At</div>
                        <div style={{ fontWeight: '500', color: '#1f2937', fontSize: '0.75rem' }}>
                          {new Date(sub.plan_request.requested_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subscription Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Status</div>
                    <div style={{
                      display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                      backgroundColor: sub.is_active ? '#dcfce7' : '#fef2f2',
                      color: sub.is_active ? '#166534' : '#dc2626'
                    }}>
                      {sub.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  {sub.subscription && (
                    <>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Amount</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                          ₹{sub.subscription.amount.toLocaleString('en-IN')}/year
                        </div>
                      </div>
                      {sub.subscription.billing_period_start && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Start Date</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                            {new Date(sub.subscription.billing_period_start).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {sub.subscription.billing_period_end && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>End Date</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                            {new Date(sub.subscription.billing_period_end).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {daysLeft !== null && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Days Remaining</div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: daysLeft < 0 ? '#dc2626' : daysLeft <= 30 ? '#f59e0b' : '#059669'
                          }}>
                            {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Payment Proofs - Review Section */}
                {pendingProofs.length > 0 && (
                  <div style={{
                    padding: '2rem',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                    border: '2px solid #fcd34d',
                    borderRadius: '0.875rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <AlertCircle style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '800', color: '#92400e', letterSpacing: '-0.01em' }}>
                        Payment Proof Review Required ({pendingProofs.length})
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9375rem', color: '#78350f', marginBottom: '1.5rem', fontWeight: '500', lineHeight: '1.6' }}>
                      Review the payment details below and verify the payment proof. Once verified, approve to activate the tenant.
                    </div>
                    {pendingProofs.map((proof) => (
                      <div key={proof.id} style={{
                        padding: '1.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.75rem',
                        marginBottom: '1.25rem',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem', letterSpacing: '-0.01em' }}>
                              Payment Details
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.9375rem' }}>
                              <div>
                                <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: '500' }}>Transaction ID</div>
                                <div style={{ fontWeight: '700', color: '#111827', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', fontSize: '0.9375rem' }}>
                                  {proof.transaction_id || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: '500' }}>Payment Amount</div>
                                <div style={{ fontWeight: '700', color: '#059669', fontSize: '1.125rem' }}>
                                  {proof.currency === 'INR' ? '₹' : '$'}{proof.amount.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: '500' }}>Payment Date</div>
                                <div style={{ fontWeight: '600', color: '#111827' }}>
                                  {proof.payment_date ? new Date(proof.payment_date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: '500' }}>Submitted</div>
                                <div style={{ fontWeight: '600', color: '#111827' }}>
                                  {new Date(proof.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                              </div>
                            </div>
                            {proof.notes && (
                              <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: '600' }}>Notes</div>
                                <div style={{ fontSize: '0.9375rem', color: '#374151', lineHeight: '1.6' }}>{proof.notes}</div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
                            {proof.payment_proof_url && (
                              <a
                                href={proof.payment_proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '0.875rem 1.25rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  borderRadius: '0.5rem',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.9375rem',
                                  fontWeight: '600',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#1d4ed8'
                                  e.currentTarget.style.transform = 'translateY(-1px)'
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 99, 235, 0.4)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#2563eb'
                                  e.currentTarget.style.transform = 'translateY(0)'
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.3)'
                                }}
                              >
                                <FileText style={{ width: '1.125rem', height: '1.125rem' }} />
                                View Payment Proof
                              </a>
                            )}
                          </div>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          gap: '1rem', 
                          flexWrap: 'wrap',
                          paddingTop: '1.5rem',
                          borderTop: '2px solid #e5e7eb',
                          justifyContent: 'flex-end'
                        }}>
                          <button
                            onClick={() => handleRejectPayment(proof.id)}
                            style={{
                              padding: '0.875rem 1.75rem',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '0.5rem',
                              fontSize: '0.9375rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2'
                              e.currentTarget.style.borderColor = '#fca5a5'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2'
                              e.currentTarget.style.borderColor = '#fecaca'
                              e.currentTarget.style.transform = 'translateY(0)'
                            }}
                          >
                            <XCircle style={{ width: '1.125rem', height: '1.125rem' }} />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprovePayment(proof.id, sub.tenant_id)}
                            style={{
                              padding: '0.875rem 1.75rem',
                              backgroundColor: '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.9375rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#047857'
                              e.currentTarget.style.transform = 'translateY(-1px)'
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(5, 150, 105, 0.4)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#059669'
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)'
                            }}
                          >
                            <CheckCircle style={{ width: '1.125rem', height: '1.125rem' }} />
                            Approve & Activate Tenant
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Apply Plan Button (when payment is approved but plan not applied) */}
                {sub.plan_request && approvedProof && !sub.subscription && (
                  <div style={{
                    padding: '1rem',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #86efac',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#166534', marginBottom: '0.25rem' }}>
                        ✅ Payment Verified
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Payment proof has been approved. Click below to apply the requested subscription plan.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!sub.plan_request) return
                        handleApplySubscriptionPlan(sub.tenant_id, sub.plan_request, approvedProof.id)
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1d4ed8'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                      Apply Subscription Plan
                    </button>
                  </div>
                )}

                {/* Latest Payment Proof Status */}
                {latestProof && latestProof.status !== 'pending' && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: latestProof.status === 'approved' ? '#dcfce7' : '#fef2f2',
                    border: `1px solid ${latestProof.status === 'approved' ? '#86efac' : '#fecaca'}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: latestProof.status === 'approved' ? '#166534' : '#dc2626'
                  }}>
                    <strong>Latest Payment:</strong> {latestProof.status === 'approved' ? 'Approved' : 'Rejected'} • 
                    Transaction: {latestProof.transaction_id || 'N/A'} • 
                    Date: {latestProof.payment_date ? new Date(latestProof.payment_date).toLocaleDateString() : 'N/A'}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
