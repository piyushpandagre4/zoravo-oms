import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      organizationName, 
      city,
      adminName, 
      adminEmail,
      adminPhone,
      adminPassword 
    } = body

    // Validate required fields
    if (!organizationName || !adminName || !adminEmail || !adminPhone || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate company name length
    if (organizationName.length < 2 || organizationName.length > 80) {
      return NextResponse.json(
        { error: 'Company name must be between 2 and 80 characters' },
        { status: 400 }
      )
    }

    // Validate name length
    if (adminName.length < 2 || adminName.length > 60) {
      return NextResponse.json(
        { error: 'Full name must be between 2 and 60 characters' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate phone number (E.164 format: +91 followed by 10 digits)
    const phoneRegex = /^\+91[6-9]\d{9}$/
    const cleanedPhone = adminPhone.replace(/\s/g, '')
    if (!phoneRegex.test(cleanedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please use format: +91 followed by 10 digits' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Check if email already exists
    const { data: existingUser } = await adminSupabase.auth.admin.listUsers()
    const userExists = existingUser.users.some(u => u.email === adminEmail)
    
    if (userExists) {
      return NextResponse.json(
        { error: 'This email already has an account. Login instead.' },
        { status: 409 }
      )
    }

    // Generate tenant code (Z01, Z02, Z03, etc.)
    // Get the highest existing tenant code number
    const { data: existingTenants } = await adminSupabase
      .from('tenants')
      .select('tenant_code')
      .not('tenant_code', 'is', null)
      .like('tenant_code', 'Z%')
      .order('tenant_code', { ascending: false })
      .limit(1)
    
    let nextCode = 'Z01'
    if (existingTenants && existingTenants.length > 0) {
      const lastCode = existingTenants[0].tenant_code
      if (lastCode && lastCode.match(/^Z(\d+)$/)) {
        const lastNum = parseInt(lastCode.substring(1))
        const nextNum = lastNum + 1
        nextCode = 'Z' + nextNum.toString().padStart(2, '0')
      }
    }

    // Generate workspace_url from tenant_code (e.g., Z01 -> tenant-z01)
    const workspaceUrl = `tenant-${nextCode.toLowerCase()}`

    // Set trial period to 24 hours from now
    const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Create tenant - active for 24 hours trial, then requires payment approval
    const tenantData: any = {
      name: organizationName,
      workspace_url: workspaceUrl,
      tenant_code: nextCode,
      is_active: true, // Active during 24-hour trial period
      is_free: false,
      subscription_status: 'trial', // Trial status - will change to 'active' after payment approval
      trial_ends_at: trialEndsAt
    }
    
    // Add city if provided (optional field)
    if (city && city.trim()) {
      tenantData.city = city.trim()
    }

    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .insert(tenantData)
      .select()
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create tenant', details: tenantError?.message },
        { status: 500 }
      )
    }

    // Create admin user (use cleaned phone number in E.164 format)
    const { data: authData, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'admin',
        phone: cleanedPhone // Store in E.164 format
      }
    })

    if (createUserError || !authData.user) {
      // Rollback: Delete tenant if user creation fails
      await adminSupabase.from('tenants').delete().eq('id', tenant.id)
      
      console.error('User creation error:', createUserError)
      return NextResponse.json(
        { error: 'Failed to create admin user', details: createUserError?.message },
        { status: 500 }
      )
    }

    // Create tenant_user relationship
    const { error: tenantUserError } = await adminSupabase
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: authData.user.id,
        role: 'admin',
        is_primary_admin: true
      })

    if (tenantUserError) {
      // Rollback: Delete user and tenant
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      await adminSupabase.from('tenants').delete().eq('id', tenant.id)
      
      console.error('Tenant user creation error:', tenantUserError)
      return NextResponse.json(
        { error: 'Failed to link user to tenant', details: tenantUserError?.message },
        { status: 500 }
      )
    }

    // Create approval request for super admin
    const { error: approvalRequestError } = await adminSupabase
      .from('tenant_approval_requests')
      .insert({
        tenant_id: tenant.id,
        admin_user_id: authData.user.id,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_phone: adminPhone,
        company_name: organizationName,
        status: 'pending'
      })

    if (approvalRequestError) {
      console.error('Approval request creation error:', approvalRequestError)
      // Don't fail the request, but log the error
    }

    // Send notification to all super admins
    try {
      const { data: superAdmins } = await adminSupabase
        .from('super_admins')
        .select('user_id')

      if (superAdmins && superAdmins.length > 0) {
        const notifications = superAdmins.map(sa => ({
          user_id: sa.user_id,
          title: 'New Tenant Approval Request',
          message: `${organizationName} (${nextCode}) has requested account approval. Admin: ${adminName} (${adminEmail})`,
          type: 'info',
          read: false,
          priority: 2,
          action_url: `/admin/tenants/${tenant.id}`
        }))

        // Insert notifications in batch
        for (const notification of notifications) {
          try {
            await adminSupabase.from('notifications').insert(notification)
          } catch (err) {
            console.error('Failed to send notification:', err)
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    // Create initial subscription record (₹12,000 INR per year)
    await adminSupabase
      .from('subscriptions')
      .insert({
        tenant_id: tenant.id,
        plan_name: 'annual',
        amount: 12000.00,
        currency: 'INR',
        status: 'pending', // Will be updated when payment is confirmed
        billing_period_start: new Date().toISOString(),
        billing_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      })

    // Initialize company settings for the new tenant
    const companySettings = [
      { 
        setting_key: 'company_name', 
        setting_value: organizationName, 
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_address', 
        setting_value: '', 
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_phone', 
        setting_value: adminPhone, 
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_email', 
        setting_value: adminEmail,
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_website', 
        setting_value: '', 
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_business_hours', 
        setting_value: 'Open ⋅ Closes 7 pm', 
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_opening_time', 
        setting_value: '09:00', 
        setting_group: 'company',
        tenant_id: tenant.id
      },
      { 
        setting_key: 'company_closing_time', 
        setting_value: '19:00', 
        setting_group: 'company',
        tenant_id: tenant.id
      }
    ]

    // Insert company settings (ignore errors if table structure is different)
    for (const setting of companySettings) {
      try {
        await adminSupabase
          .from('system_settings')
          .insert(setting)
      } catch (error: any) {
        // Ignore errors - settings can be added later via UI
        console.warn('Could not initialize company settings:', error?.message || error)
      }
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        tenant_code: nextCode,
        workspace_url: workspaceUrl
      },
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      tenant_code: nextCode,
      message: 'Account created successfully. Your account is pending approval. You will receive your tenant number shortly.'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error.message },
      { status: 500 }
    )
  }
}

