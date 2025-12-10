import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    console.log('User creation request received')

    // Get request body
    let body
    try {
      body = await request.json()
      console.log('Request body parsed:', { ...body, password: body.password ? '[REDACTED]' : undefined })
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parseError.message 
      }, { status: 400 })
    }
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

    // Prepare profile data - only use columns that exist in the profiles table
    // The profiles table schema has: id, email, name, role, created_at, updated_at
    // Note: phone, departments, and specialization are NOT in profiles table
    // They should be stored in auth.users user_metadata or a separate table
    const profileData: any = {
      id: authData.user.id,
      email,
      name,
      role
      // Note: phone is stored in auth.users user_metadata, not in profiles table
      // Note: departments and specialization are not in profiles table schema
    }

    // Wait a bit more to ensure trigger has finished (if it exists)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if profile already exists (might have been created by trigger)
    const { data: existingProfile } = await adminSupabase
      .from('profiles')
      .select('id, role, name, email')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (existingProfile) {
      console.log('Profile already exists (likely created by trigger), updating with correct role:', role)
      // Profile exists, just update it with correct role and data
      // Only update columns that exist in the profiles table
      const updateData: any = {
        role: role, // CRITICAL: Ensure role is always set correctly
        name: name,
        email: email
        // Note: departments and specialization are not in profiles table schema
      }
      
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', authData.user.id)
      
      if (updateError) {
        console.error('Error updating existing profile:', updateError)
        // Try updating with only core fields (role, name, email) - these definitely exist
        const coreUpdateData = {
          role: role,
          name: name,
          email: email
        }
        
        const { error: coreUpdateError } = await adminSupabase
          .from('profiles')
          .update(coreUpdateData)
          .eq('id', authData.user.id)
        
        if (coreUpdateError) {
          console.error('Error updating profile with core fields:', coreUpdateError)
          // Even if update fails, check if role is already correct
          if (existingProfile.role === role) {
            console.log('Profile role is already correct, continuing despite update error')
          } else {
            return NextResponse.json({ 
              error: 'Failed to update profile role',
              details: coreUpdateError?.message || 'Unknown database error',
              code: coreUpdateError?.code,
              hint: coreUpdateError?.hint
            }, { status: 500 })
          }
        } else {
          console.log('Profile updated successfully with core fields, role:', role)
          // Note: departments and specialization are not in profiles table
          // They should be stored elsewhere (e.g., user_metadata or separate table)
        }
      } else {
        console.log('Profile updated successfully with role:', role)
      }
    } else {
      // Profile doesn't exist, create it
      console.log('Profile does not exist, creating new profile with role:', role)
      const { error: profileCreateError } = await adminSupabase
        .from('profiles')
        .insert(profileData)

      if (profileCreateError) {
        console.error('Error creating profile:', profileCreateError)
        // Check if profile was created by trigger in the meantime
        await new Promise(resolve => setTimeout(resolve, 300))
        const { data: checkProfile } = await adminSupabase
          .from('profiles')
          .select('id, role')
          .eq('id', authData.user.id)
          .maybeSingle()
        
        if (checkProfile) {
          console.log('Profile was created by trigger, updating role to:', role)
          // Profile exists now, update it
          const { error: updateError } = await adminSupabase
            .from('profiles')
            .update({ role: role, name: name, email: email })
            .eq('id', authData.user.id)
          
          if (updateError) {
            console.error('Error updating trigger-created profile:', updateError)
            // If role is already correct, continue
            if (checkProfile.role === role) {
              console.log('Profile role is already correct')
            } else {
              return NextResponse.json({ 
                error: 'Failed to update profile role',
                details: updateError.message
              }, { status: 500 })
            }
          }
        } else {
          return NextResponse.json({ 
            error: 'Failed to create profile',
            details: profileCreateError.message
          }, { status: 500 })
        }
      } else {
        console.log('Profile created successfully with role:', role)
      }
    }
    
    // Final verification: ensure profile exists with correct role
    // This is critical - we need to verify before proceeding
    await new Promise(resolve => setTimeout(resolve, 200))
    const { data: finalProfile, error: verifyError } = await adminSupabase
      .from('profiles')
      .select('id, role, name, email')
      .eq('id', authData.user.id)
      .single()
    
    if (verifyError || !finalProfile) {
      console.error('Profile verification failed:', verifyError)
      return NextResponse.json({ 
        error: 'Profile verification failed',
        details: verifyError?.message || 'Profile was not found after creation/update'
      }, { status: 500 })
    }
    
    // Verify role is correct
    if (finalProfile.role !== role) {
      console.warn(`Profile role mismatch: expected ${role}, got ${finalProfile.role}. Attempting to fix...`)
      // Try one more time to fix the role
      const { error: finalUpdateError } = await adminSupabase
        .from('profiles')
        .update({ role: role })
        .eq('id', authData.user.id)
      
      if (finalUpdateError) {
        console.error('Could not fix profile role:', finalUpdateError)
        return NextResponse.json({ 
          error: 'Profile role is incorrect and could not be fixed',
          details: finalUpdateError.message,
          currentRole: finalProfile.role,
          expectedRole: role
        }, { status: 500 })
      } else {
        console.log('Profile role fixed successfully')
      }
    } else {
      console.log('Profile verified successfully with correct role:', role)
    }

    // Create tenant_users relationship if tenant_id is provided
    // CRITICAL: This must succeed for the user to appear in tenant-specific queries
    if (tenant_id) {
      console.log('🔗 Creating tenant_users relationship:', {
        tenant_id,
        user_id: authData.user.id,
        role
      })
      
      // Check if relationship already exists
      const { data: existingTenantUser } = await adminSupabase
        .from('tenant_users')
        .select('id, role, tenant_id')
        .eq('tenant_id', tenant_id)
        .eq('user_id', authData.user.id)
        .maybeSingle()

      if (existingTenantUser) {
        console.log('⚠️ Tenant user relationship already exists, updating role')
        // Update existing relationship to ensure role is correct
        const { error: updateTenantUserError } = await adminSupabase
          .from('tenant_users')
          .update({ role: role })
          .eq('id', existingTenantUser.id)

        if (updateTenantUserError) {
          console.error('❌ Error updating tenant_users relationship:', updateTenantUserError)
          return NextResponse.json({ 
            error: 'Failed to update tenant relationship',
            details: updateTenantUserError.message 
          }, { status: 500 })
        } else {
          console.log('✅ Tenant user relationship updated successfully with role:', role)
        }
      } else {
        // Create new relationship
        const { error: tenantUserError } = await adminSupabase
          .from('tenant_users')
          .insert({
            tenant_id: tenant_id,
            user_id: authData.user.id,
            role: role // CRITICAL: Use the role from request, not default
          })

        if (tenantUserError) {
          console.error('❌ Error creating tenant_users relationship:', tenantUserError)
          // This is critical for tenant-specific queries - return error
          return NextResponse.json({ 
            error: 'Failed to create tenant relationship',
            details: tenantUserError.message 
          }, { status: 500 })
        } else {
          console.log('✅ Tenant user relationship created successfully with role:', role)
        }
      }
      
      // Verify the relationship was created correctly
      await new Promise(resolve => setTimeout(resolve, 200))
      const { data: verifyTenantUser, error: verifyError } = await adminSupabase
        .from('tenant_users')
        .select('id, role, tenant_id')
        .eq('tenant_id', tenant_id)
        .eq('user_id', authData.user.id)
        .eq('role', role)
        .single()
      
      if (verifyError || !verifyTenantUser) {
        console.error('❌ Verification failed: tenant_users relationship not found after creation', verifyError)
        return NextResponse.json({ 
          error: 'Tenant relationship verification failed',
          details: verifyError?.message || 'Relationship was not found after creation'
        }, { status: 500 })
      } else {
        console.log('✅ Verified tenant_users relationship exists:', verifyTenantUser)
      }
    } else {
      console.warn('⚠️ No tenant_id provided - user will not be linked to any tenant')
      return NextResponse.json({ 
        error: 'Tenant ID is required',
        details: 'Cannot create user without tenant_id. Please ensure you are logged in to a tenant workspace.'
      }, { status: 400 })
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
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
    const errorDetails = error?.details || error?.hint || error?.code || null
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails,
      fullError: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}
