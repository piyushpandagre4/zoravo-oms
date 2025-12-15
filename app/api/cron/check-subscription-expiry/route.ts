import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API Route: POST /api/cron/check-subscription-expiry
 * 
 * Automatically deactivates tenants when their subscription expires
 * This should be called daily (via cron job) to maintain inactive sessions
 * 
 * Headers:
 * - Authorization: Bearer token (optional, for security)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const now = new Date()

    // Get all tenants with subscriptions and trial info
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        is_active,
        subscription_status,
        trial_ends_at,
        subscriptions(id, status, billing_period_end)
      `)

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`)
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tenants found',
        deactivated: 0
      })
    }

    let deactivatedCount = 0
    const errors: string[] = []

    // Process each tenant
    for (const tenant of tenants) {
      try {
        const subscription = tenant.subscriptions?.[0] || null
        let shouldDeactivate = false
        let deactivationReason = ''
        
        // Check subscription expiration
        if (subscription && subscription.billing_period_end) {
          const endDate = new Date(subscription.billing_period_end)
          const isExpired = endDate < now
          
          if (isExpired && tenant.is_active) {
            shouldDeactivate = true
            deactivationReason = 'subscription expired'
          }
        }
        
        // Check trial expiration (if no active subscription)
        // Only check trial if tenant is in trial status and has no active subscription
        if (!shouldDeactivate && tenant.subscription_status === 'trial' && tenant.trial_ends_at) {
          const trialEndDate = new Date(tenant.trial_ends_at)
          const trialExpired = trialEndDate < now
          
          if (trialExpired && tenant.is_active) {
            shouldDeactivate = true
            deactivationReason = 'trial period expired'
          }
        }

        // Deactivate tenant if needed
        if (shouldDeactivate) {
          const { error: updateError } = await supabase
            .from('tenants')
            .update({
              is_active: false,
              subscription_status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('id', tenant.id)

          if (updateError) {
            const errorMsg = `Failed to deactivate tenant ${tenant.id}: ${updateError.message}`
            console.error(errorMsg)
            errors.push(errorMsg)
          } else {
            deactivatedCount++
            console.log(`✅ Tenant ${tenant.name} (${tenant.id}) deactivated - ${deactivationReason}`)
          }
        }
      } catch (error: any) {
        const errorMsg = `Error processing tenant ${tenant.id}: ${error.message}`
        console.error(errorMsg, error)
        errors.push(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Subscription expiry check completed`,
      deactivated: deactivatedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error: any) {
    console.error('Error in subscription expiry check:', error)
    return NextResponse.json(
      {
        error: 'Failed to check subscription expiry',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}

