'use client'

import { useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import { AlertCircle, Lock } from 'lucide-react'

interface SubscriptionGuardProps {
  children: ReactNode
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isActive: boolean
    isExpired: boolean
    daysRemaining: number | null
    subscriptionEndDate: string | null
    isAdmin?: boolean
    tenantInactive?: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()

  // Pages that are always accessible even when subscription expired
  const allowedPagesWhenExpired = ['/settings', '/about']

  useEffect(() => {
    checkSubscriptionStatus()
    
    // Check subscription status periodically (every 5 minutes) to handle expired sessions
    const interval = setInterval(() => {
      checkSubscriptionStatus()
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!user || authError) {
        // Session expired - redirect to login
        console.log('Session expired in SubscriptionGuard, redirecting to login')
        if (typeof window !== 'undefined') {
          sessionStorage.clear()
          await supabase.auth.signOut()
          router.push('/login')
        }
        setLoading(false)
        return
      }

      // Get tenant ID from session storage
      const tenantId = sessionStorage.getItem('current_tenant_id')
      if (!tenantId) {
        setLoading(false)
        return
      }

      // Get tenant and subscription info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          id,
          is_active,
          subscription_status,
          trial_ends_at,
          subscriptions(status, billing_period_end)
        `)
        .eq('id', tenantId)
        .single()

      if (tenantError || !tenantData) {
        setLoading(false)
        return
      }

      // Check if current user is admin - admins can access even when tenant is inactive
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single()

      const isAdmin = tenantUser?.role === 'admin'

      const subscription = tenantData.subscriptions?.[0] || null
      const subscriptionEndDate = subscription?.billing_period_end || null
      
      // Check if trial has expired
      let trialExpired = false
      if (tenantData.trial_ends_at) {
        const now = new Date().getTime()
        const trialEnd = new Date(tenantData.trial_ends_at).getTime()
        trialExpired = trialEnd < now
      }
      
      let isExpired = false
      let daysRemaining: number | null = null

      if (subscriptionEndDate) {
        const now = new Date().getTime()
        const end = new Date(subscriptionEndDate).getTime()
        const diff = end - now
        daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
        isExpired = daysRemaining < 0
      } else {
        // No subscription: 
        // - Check if trial expired (if in trial status)
        // - If tenant is in trial and trial expired, treat as expired
        // - If tenant is active and not in trial, treat as active (legacy tenant or manually activated)
        // - If tenant is inactive, treat as expired
        if (tenantData.subscription_status === 'trial' && trialExpired) {
          isExpired = true
        } else {
          isExpired = !tenantData.is_active
        }
      }

      // Check if tenant is inactive
      const tenantInactive = !tenantData.is_active
      
      // Tenant is active if:
      // 1. Tenant is_active = true AND
      // 2. (No subscription exists OR subscription not expired) AND
      // 3. (Not in trial OR trial not expired)
      // If subscription expired or trial expired, tenant should be inactive
      // Note: Even admins should see the blur screen when tenant is inactive
      // Admins can still access Settings to submit payment proof
      const isActive = tenantData.is_active && 
                       (!subscriptionEndDate || !isExpired) &&
                       (tenantData.subscription_status !== 'trial' || !trialExpired)

      setSubscriptionStatus({
        isActive,
        isExpired,
        daysRemaining,
        subscriptionEndDate,
        isAdmin: isAdmin || false,
        tenantInactive: tenantInactive
      })
    } catch (error) {
      console.error('Error checking subscription status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    )
  }

  // Check if current page is allowed when expired/inactive
  const isAllowedPage = allowedPagesWhenExpired.some(page => pathname?.startsWith(page))

  // Block access if tenant is not active (either expired subscription or inactive tenant)
  // But allow:
  // 1. All users (including admins) to access Settings and About pages when tenant is inactive/expired
  // 2. If subscriptionStatus is null, don't block (still loading or no tenant)
  // Note: Even admins should see the blur screen - they can access Settings to reactivate
  const shouldBlock = 
    subscriptionStatus !== null &&
    !subscriptionStatus.isActive && 
    !isAllowedPage

  if (shouldBlock) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* Blurred Content */}
        <div style={{
          filter: 'blur(5px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.5
        }}>
          {children}
        </div>

        {/* Overlay Message */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2.5rem',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Lock style={{ width: '2rem', height: '2rem', color: '#dc2626' }} />
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '1rem'
            }}>
              {subscriptionStatus?.tenantInactive 
                ? 'Account Inactive' 
                : subscriptionStatus?.isExpired 
                  ? 'Trial Period Expired' 
                  : 'Subscription Expired'}
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              {subscriptionStatus?.tenantInactive 
                ? 'Your account has been deactivated. Please contact your administrator or submit payment proof in Settings to reactivate your account.'
                : subscriptionStatus?.isExpired && !subscriptionStatus?.subscriptionEndDate
                  ? 'Your trial period has expired. Please submit payment proof in Settings to continue using the service.'
                  : 'Your subscription has expired. Please submit payment proof in Settings to continue using the service.'
              }
            </p>
            {subscriptionStatus && subscriptionStatus.daysRemaining !== null && subscriptionStatus.daysRemaining < 0 && (
              <p style={{
                fontSize: '0.875rem',
                color: '#dc2626',
                fontWeight: '600',
                marginBottom: '1.5rem'
              }}>
                Expired {Math.abs(subscriptionStatus.daysRemaining)} days ago
              </p>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => router.push('/settings')}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }}
              >
                Go to Settings
              </button>
              <button
                onClick={() => router.push('/about')}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                About
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If subscription is active or on allowed page, show content normally
  return <>{children}</>
}

