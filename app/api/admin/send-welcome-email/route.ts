import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email-service'

// Test endpoint to verify route is working
export async function GET() {
  return NextResponse.json({ 
    message: 'Send welcome email API is working',
    endpoint: '/api/admin/send-welcome-email'
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId } = body

    console.log('[Send Welcome Email] Received request:', { tenantId })

    if (!tenantId) {
      console.error('[Send Welcome Email] Missing tenantId')
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Validate environment variables before creating admin client
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Send Welcome Email] Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. Please add it to your .env.local file.'
        },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[Send Welcome Email] Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'NEXT_PUBLIC_SUPABASE_URL is not set in environment variables.'
        },
        { status: 500 }
      )
    }

    let adminSupabase
    try {
      adminSupabase = createAdminClient()
    } catch (error: any) {
      console.error('[Send Welcome Email] Failed to create admin client:', error)
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: error.message || 'Failed to initialize admin client. Please check your Supabase credentials.'
        },
        { status: 500 }
      )
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    console.log('[Send Welcome Email] Tenant lookup:', { 
      tenantId, 
      found: !!tenant, 
      error: tenantError?.message,
      errorCode: tenantError?.code,
      errorDetails: tenantError 
    })

    if (tenantError) {
      console.error('[Send Welcome Email] Tenant lookup error:', tenantError)
      
      // Check for invalid API key error
      if (tenantError.message?.includes('Invalid API key') || tenantError.message?.includes('JWT')) {
        return NextResponse.json(
          { 
            error: 'Invalid API key',
            details: 'The SUPABASE_SERVICE_ROLE_KEY in your .env.local file is invalid or expired. Please check your Supabase project settings and update the key.',
            errorCode: tenantError.code
          },
          { status: 500 }
        )
      }
      
      // Check if it's a "not found" error
      if (tenantError.code === 'PGRST116' || tenantError.message?.includes('No rows')) {
        return NextResponse.json(
          { 
            error: 'Tenant not found', 
            details: `No tenant found with ID: ${tenantId}`,
            tenantId 
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to lookup tenant', 
          details: tenantError.message,
          errorCode: tenantError.code,
          tenantId 
        },
        { status: 500 }
      )
    }

    if (!tenant) {
      console.error('[Send Welcome Email] Tenant not found:', tenantId)
      return NextResponse.json(
        { 
          error: 'Tenant not found',
          details: `No tenant found with ID: ${tenantId}`,
          tenantId 
        },
        { status: 404 }
      )
    }

    console.log('[Send Welcome Email] Tenant found:', { 
      id: tenant.id, 
      name: tenant.name, 
      workspace: tenant.workspace_url 
    })

    // Get primary admin for the tenant
    // First try to find primary admin
    let { data: tenantUser, error: tenantUserError } = await adminSupabase
      .from('tenant_users')
      .select('user_id, role, is_primary_admin')
      .eq('tenant_id', tenantId)
      .eq('is_primary_admin', true)
      .eq('role', 'admin')
      .maybeSingle()

    // If no primary admin, try to find any admin
    if (!tenantUser && !tenantUserError) {
      console.log('[Send Welcome Email] No primary admin found, looking for any admin')
      const { data: anyAdmin, error: anyAdminError } = await adminSupabase
        .from('tenant_users')
        .select('user_id, role, is_primary_admin')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle()
      
      tenantUser = anyAdmin
      tenantUserError = anyAdminError
    }

    console.log('[Send Welcome Email] Admin lookup:', { 
      found: !!tenantUser, 
      error: tenantUserError?.message 
    })

    if (tenantUserError) {
      console.error('[Send Welcome Email] Admin lookup error:', tenantUserError)
      return NextResponse.json(
        { 
          error: 'Failed to find admin for this tenant', 
          details: tenantUserError.message 
        },
        { status: 404 }
      )
    }

    if (!tenantUser) {
      console.error('[Send Welcome Email] No admin found for tenant:', tenantId)
      return NextResponse.json(
        { error: 'Admin not found for this tenant. Please ensure the tenant has at least one admin user.' },
        { status: 404 }
      )
    }

    // Get user details from auth.users
    const { data: users, error: usersError } = await adminSupabase.auth.admin.listUsers()
    
    if (usersError) {
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      )
    }

    const adminUser = users.users.find(u => u.id === tenantUser.user_id)

    if (!adminUser || !adminUser.email) {
      return NextResponse.json(
        { error: 'Admin email not found' },
        { status: 404 }
      )
    }

    // Get subscription details for pricing
    const { data: subscription } = await adminSupabase
      .from('subscriptions')
      .select('amount, currency')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get support email from platform settings
    const { data: supportEmailSetting } = await adminSupabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'support_email')
      .is('tenant_id', null)
      .maybeSingle()

    // Get support email from settings or use default
    const supportEmail = supportEmailSetting?.setting_value || 'info@zoravo.in'

    // Determine pricing
    const pricingAmount = subscription?.amount || 12000
    const currency = subscription?.currency || 'INR'

    // Generate login URL - use environment variable or default to zoravo.in
    const baseDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'zoravo.in'
    const loginUrl = `https://${tenant.workspace_url}.${baseDomain}/login`

    // Send welcome email
    const emailResult = await sendWelcomeEmail({
      tenantName: tenant.name,
      adminName: adminUser.user_metadata?.name || adminUser.email.split('@')[0],
      adminEmail: adminUser.email,
      workspaceUrl: tenant.workspace_url,
      loginUrl: loginUrl,
      pricingAmount: pricingAmount,
      currency: currency,
      supportEmail: supportEmail
    })

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      emailId: emailResult.messageId
    })

  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send welcome email', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

