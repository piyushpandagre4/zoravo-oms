import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET: Fetch available subscription plans (PUBLIC - no auth required)
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Fetch platform subscription plans (tenant_id IS NULL) - PUBLIC ACCESS
    const { data: platformSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'subscription_plans')
      .is('tenant_id', null)
      .maybeSingle()

    // Log for debugging
    if (settingsError) {
      console.error('Error fetching subscription plans from database:', settingsError)
    }

    let plans: any[] = []
    if (platformSettings?.setting_value) {
      try {
        const parsedPlans = JSON.parse(platformSettings.setting_value)
        // Ensure it's an array
        if (Array.isArray(parsedPlans)) {
          plans = parsedPlans
          console.log(`Loaded ${plans.length} subscription plans from database`)
        } else {
          console.warn('Subscription plans data is not an array:', typeof parsedPlans)
        }
      } catch (e) {
        console.error('Error parsing subscription plans:', e)
        // Return empty array if parsing fails
        return NextResponse.json({ plans: [], error: 'Failed to parse subscription plans' })
      }
    } else {
      console.log('No subscription plans found in database. Using default plan.')
      // Return default plan if none exists
      plans = [{
        plan_name: 'annual',
        plan_display_name: 'Annual Plan',
        amount: 12000,
        currency: 'INR',
        billing_cycle: 'annual',
        trial_days: 24,
        is_active: true,
        features: []
      }]
    }

    // Filter only active plans
    const activePlans = plans.filter((plan: any) => {
      if (!plan) return false
      // Check if plan is active (default to true if not specified)
      return plan.is_active !== false
    })

    // If no active plans, return default
    if (activePlans.length === 0) {
      return NextResponse.json({ 
        plans: [{
          plan_name: 'annual',
          plan_display_name: 'Annual Plan',
          amount: 12000,
          currency: 'INR',
          billing_cycle: 'annual',
          trial_days: 24,
          is_active: true,
          features: []
        }]
      })
    }

    console.log(`Returning ${activePlans.length} active subscription plans`)

    return NextResponse.json({ plans: activePlans || [] })
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error)
    // Return default plan on error
    return NextResponse.json({ 
      plans: [{
        plan_name: 'annual',
        plan_display_name: 'Annual Plan',
        amount: 12000,
        currency: 'INR',
        billing_cycle: 'annual',
        trial_days: 24,
        is_active: true,
        features: []
      }]
    })
  }
}

