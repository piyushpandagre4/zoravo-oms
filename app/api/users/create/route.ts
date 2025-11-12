import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    console.log('User creation request received')

    // Get request body
    const body = await request.json()
    const { email, password, name, phone, role, department, departments, specialization, tenant_id } = body

    // Validate required fields
    if (!email || !name || !phone || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'SUPABASE_SERVICE_ROLE_KEY not found in environment variables' 
      }, { status: 500 })
    }

    // Create auth user using Supabase Admin API (requires service_role key)
    let adminSupabase
    try {
      adminSupabase = createAdminClient()
      console.log('Admin client created successfully')
    } catch (error: any) {
      console.error('Admin client error:', error.message)
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: error.message 
      }, { status: 500 })
    }
    
    // Try to create the user WITHOUT the trigger (temporarily disable it)
    const { data: authData, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password: password || `${email}123!`, // Default password if not provided
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
        phone
      }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return NextResponse.json({ 
        error: 'Failed to create user',
        details: createError.message 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    console.log('Auth user created:', authData.user.id)

    // Wait a bit to ensure auth user is fully created
    await new Promise(resolve => setTimeout(resolve, 300))

    // Prepare profile data with all fields including departments
    const profileData: any = {
      id: authData.user.id,
      email,
      name,
      role,
      phone
    }
    
    // Add department information to initial profile creation
    if (departments && Array.isArray(departments) && departments.length > 0) {
      // Try setting a JSON/array column named `departments`; fallback to comma string in `department`
      profileData.departments = departments
      // Also set department as comma-separated string for backward compatibility
      profileData.department = departments.join(', ')
    } else if (department) {
      profileData.department = department
    }
    
    if (specialization) {
      profileData.specialization = specialization
    }

    // Create profile manually using admin client with all fields
    const { error: profileCreateError } = await adminSupabase
      .from('profiles')
      .insert(profileData)

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError)
      // Don't delete the auth user - profile creation might fail but user exists
      console.warn('Profile creation failed but auth user was created:', authData.user.id)
      
      // Try to update profile if creation failed (might already exist)
      if (departments && Array.isArray(departments) && departments.length > 0) {
        const updateData: any = {
          departments: departments,
          department: departments.join(', ')
        }
        if (specialization) updateData.specialization = specialization
        
        const { error: updateError } = await adminSupabase
          .from('profiles')
          .update(updateData)
          .eq('id', authData.user.id)
        
        if (updateError) {
          console.error('Error updating profile with departments:', updateError)
        } else {
          console.log('Profile updated with departments successfully')
        }
      }
    } else {
      console.log('Profile created successfully with all fields')
    }

    // Create tenant_users relationship if tenant_id is provided
    if (tenant_id) {
      const { error: tenantUserError } = await adminSupabase
        .from('tenant_users')
        .insert({
          tenant_id: tenant_id,
          user_id: authData.user.id,
          role: role
        })

      if (tenantUserError) {
        console.error('Error creating tenant_users relationship:', tenantUserError)
        // Don't fail the request - user is created, just not linked to tenant
        console.warn('Tenant user relationship creation failed but user was created:', authData.user.id)
      } else {
        console.log('Tenant user relationship created successfully')
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role
      }
    })
  } catch (error: any) {
    console.error('Error in user creation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
