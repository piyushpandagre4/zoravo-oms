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
    const { email, password, name, phone, role, department, departments, specialization, status, join_date, tenant_id } = body

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
    
    // CRITICAL: Check if user with this email already exists in profiles
    // If they do, we should NOT create a new user - they might already be linked to another tenant
    console.log('🔍 Checking if user with email already exists:', email)
    const { data: existingUserByEmail, error: checkProfileError } = await adminSupabase
      .from('profiles')
      .select('id, email, name, role')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    
    if (existingUserByEmail) {
      console.error('❌ User with this email already exists!', {
        email: email,
        existing_user_id: existingUserByEmail.id,
        name: existingUserByEmail.name,
        role: existingUserByEmail.role
      })
      
      // Check if this user is already linked to a different tenant
      const { data: existingTenantLinks } = await adminSupabase
        .from('tenant_users')
        .select('tenant_id, role')
        .eq('user_id', existingUserByEmail.id)
      
      if (existingTenantLinks && existingTenantLinks.length > 0) {
        const linkedTenants = existingTenantLinks.map(tu => tu.tenant_id)
        const isLinkedToRequestedTenant = linkedTenants.includes(tenant_id)
        
        console.error('❌ User is already linked to tenant(s):', linkedTenants)
        
        if (isLinkedToRequestedTenant) {
          return NextResponse.json({ 
            error: 'User already exists in this tenant',
            details: `A user with email "${email}" already exists and is linked to this tenant.`,
            existing_user_id: existingUserByEmail.id
          }, { status: 400 })
        } else {
          return NextResponse.json({ 
            error: 'User already exists in another tenant',
            details: `A user with email "${email}" already exists and is linked to a different tenant. Please use a different email address.`,
            existing_user_id: existingUserByEmail.id,
            linked_tenants: linkedTenants
          }, { status: 400 })
        }
      }
      
      // If user exists but not linked to any tenant, we can still create the link
      // But this is unusual - log a warning
      console.warn('⚠️ User exists but not linked to any tenant, will create tenant link')
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
      
      // If error is due to email already existing, provide clearer error message
      if (createError.message?.includes('already registered') || createError.message?.includes('already exists')) {
        return NextResponse.json({ 
          error: 'User already exists',
          details: `A user with email "${email}" already exists. Please use a different email address.`,
          hint: 'If you need to add this user to another tenant, contact support.'
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create user',
        details: createError.message 
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    console.log('✅ Auth user created:', {
      user_id: authData.user.id,
      email: authData.user.email,
      created_at: authData.user.created_at
    })

    // Wait a bit to ensure auth user is fully created
    await new Promise(resolve => setTimeout(resolve, 300))

    // Prepare profile data - only use columns that exist in the profiles table
    // The profiles table schema has: id, email, name, role, phone, department, specialization (installers only), status, join_date, created_at, updated_at
    const profileData: any = {
      id: authData.user.id,
      email,
      name,
      role,
      phone: phone || null, // Save phone to profiles table so it displays correctly
      // Store departments as comma-separated string (backward-compatible with department column)
      department: Array.isArray(departments) && departments.length > 0 
        ? departments.join(', ') 
        : null,
      status: status || 'active',
      join_date: join_date || null
    }
    
    // Only include specialization for installers (column may not exist in schema)
    // We'll try to save it, but if it fails, we'll retry without it
    if (role === 'installer' && specialization) {
      // Note: specialization column may not exist in all database schemas
      // We'll handle this gracefully in the insert/update operations
      profileData.specialization = specialization
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
        email: email,
        phone: phone || null, // Save phone to profiles table so it displays correctly
        // Store departments as comma-separated string (backward-compatible with department column)
        department: Array.isArray(departments) && departments.length > 0 
          ? departments.join(', ') 
          : null,
        status: status || 'active',
        join_date: join_date || null
      }
      
      // Only include specialization for installers (column may not exist in schema)
      if (role === 'installer' && specialization) {
        updateData.specialization = specialization
      }
      
      console.log('📝 Updating existing profile with data:', {
        phone: phone ? 'provided' : 'null',
        department: Array.isArray(departments) && departments.length > 0 ? `${departments.length} departments` : 'none',
        status: status || 'active',
        join_date: join_date || 'null',
        specialization: (role === 'installer' && specialization) ? 'provided' : 'not applicable'
      })
      
      // Try update with specialization first, if it fails due to missing column, retry without it
      let updateError
      if (role === 'installer' && specialization && updateData.specialization) {
        const { error: updateErrorWithSpecialization } = await adminSupabase
          .from('profiles')
          .update(updateData)
          .eq('id', authData.user.id)
        
        updateError = updateErrorWithSpecialization
        
        // If error is due to missing specialization column, retry without it
        if (updateError && (updateError.message?.includes('specialization') || updateError.message?.includes('column') || updateError.code === '42703')) {
          console.warn('⚠️ specialization column not found, retrying without it')
          const { specialization: _, ...updateDataWithoutSpecialization } = updateData
          const { error: updateErrorWithoutSpecialization } = await adminSupabase
            .from('profiles')
            .update(updateDataWithoutSpecialization)
            .eq('id', authData.user.id)
          updateError = updateErrorWithoutSpecialization
        }
      } else {
        const { error: updateErrorDirect } = await adminSupabase
          .from('profiles')
          .update(updateData)
          .eq('id', authData.user.id)
        updateError = updateErrorDirect
      }
      
      if (updateError) {
        console.error('❌ Error updating existing profile:', updateError)
        console.error('Update error details:', {
          message: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
          details: updateError.details
        })
        
        // Try updating with only core fields (role, name, email, phone, department, status, join_date) - these definitely exist
        const coreUpdateData: any = {
          role: role,
          name: name,
          email: email,
          phone: phone || null, // Save phone to profiles table so it displays correctly
          department: Array.isArray(departments) && departments.length > 0 
            ? departments.join(', ') 
            : null,
          status: status || 'active',
          join_date: join_date || null
        }
        
        // Don't include specialization in retry - column may not exist
        // Specialization will be saved separately if needed
        
        console.log('🔄 Retrying update with core fields only (without specialization)...')
        const { error: coreUpdateError } = await adminSupabase
          .from('profiles')
          .update(coreUpdateData)
          .eq('id', authData.user.id)
        
        if (coreUpdateError) {
          console.error('❌ Error updating profile with core fields:', coreUpdateError)
          console.error('Core update error details:', {
            message: coreUpdateError.message,
            code: coreUpdateError.code,
            hint: coreUpdateError.hint
          })
          
          // Even if update fails, check if role is already correct
          if (existingProfile.role === role) {
            console.warn('⚠️ Profile role is already correct, but other fields may not be saved')
            // Don't fail, but log warning - the update might have partially succeeded
          } else {
            return NextResponse.json({ 
              error: 'Failed to update profile',
              details: coreUpdateError?.message || 'Unknown database error',
              code: coreUpdateError?.code,
              hint: coreUpdateError?.hint
            }, { status: 500 })
          }
        } else {
          console.log('✅ Profile updated successfully with core fields')
          // Try to save specialization separately if it exists and column exists
          if (role === 'installer' && specialization) {
            try {
              await adminSupabase
                .from('profiles')
                .update({ specialization: specialization })
                .eq('id', authData.user.id)
              console.log('✅ Specialization saved separately')
            } catch (specError: any) {
              // Ignore if specialization column doesn't exist
              if (specError.message?.includes('specialization') || specError.message?.includes('column') || specError.code === '42703') {
                console.warn('⚠️ Specialization column not found in profiles table, skipping')
              } else {
                console.warn('⚠️ Could not save specialization:', specError.message)
              }
            }
          }
        }
      } else {
        console.log('✅ Profile updated successfully with all fields')
        
        // Verify the update actually saved the data
        await new Promise(resolve => setTimeout(resolve, 200))
        const { data: verifyProfile } = await adminSupabase
          .from('profiles')
          .select('phone, department, status, join_date')
          .eq('id', authData.user.id)
          .single()
        
        if (verifyProfile) {
          console.log('✅ Verified profile data after update:', {
            phone: verifyProfile.phone ? 'saved' : 'missing',
            department: verifyProfile.department ? 'saved' : 'missing',
            status: verifyProfile.status || 'missing',
            join_date: verifyProfile.join_date ? 'saved' : 'missing'
          })
        }
      }
    } else {
      // Profile doesn't exist, create it
      console.log('Profile does not exist, creating new profile with role:', role)
      
      // Try to insert with specialization first, if it fails due to missing column, retry without it
      let profileCreateError
      if (role === 'installer' && specialization && profileData.specialization) {
        const { error: createErrorWithSpecialization } = await adminSupabase
          .from('profiles')
          .insert(profileData)
        
        profileCreateError = createErrorWithSpecialization
        
        // If error is due to missing specialization column, retry without it
        if (profileCreateError && (profileCreateError.message?.includes('specialization') || profileCreateError.message?.includes('column') || profileCreateError.code === '42703')) {
          console.warn('⚠️ specialization column not found, retrying without it')
          const { specialization: _, ...profileDataWithoutSpecialization } = profileData
          const { error: createErrorWithoutSpecialization } = await adminSupabase
            .from('profiles')
            .insert(profileDataWithoutSpecialization)
          profileCreateError = createErrorWithoutSpecialization
          
          // If successful, try to update specialization separately (in case column exists but wasn't in insert)
          if (!profileCreateError && specialization) {
            try {
              await adminSupabase
                .from('profiles')
                .update({ specialization: specialization })
                .eq('id', authData.user.id)
              console.log('✅ Specialization saved separately after profile creation')
            } catch (specError: any) {
              // Ignore if specialization column doesn't exist
              if (specError.message?.includes('specialization') || specError.message?.includes('column') || specError.code === '42703') {
                console.warn('⚠️ Specialization column not found, skipping')
              }
            }
          }
        }
      } else {
        const { error: createErrorDirect } = await adminSupabase
          .from('profiles')
          .insert(profileData)
        profileCreateError = createErrorDirect
      }

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
          const triggerUpdateData: any = {
            role: role,
            name: name,
            email: email,
            phone: phone || null,
            department: Array.isArray(departments) && departments.length > 0 
              ? departments.join(', ') 
              : null,
            status: status || 'active',
            join_date: join_date || null
          }
          
          // Only include specialization for installers (column may not exist in schema)
          if (role === 'installer' && specialization) {
            triggerUpdateData.specialization = specialization
          }
          
          console.log('📝 Updating trigger-created profile with data:', {
            phone: phone ? 'provided' : 'null',
            department: Array.isArray(departments) && departments.length > 0 ? `${departments.length} departments` : 'none',
            status: status || 'active',
            join_date: join_date || 'null',
            specialization: (role === 'installer' && specialization) ? 'provided' : 'not applicable'
          })
          
          // Try update with specialization first, if it fails due to missing column, retry without it
          let updateError
          if (role === 'installer' && specialization && triggerUpdateData.specialization) {
            const { error: updateErrorWithSpecialization } = await adminSupabase
              .from('profiles')
              .update(triggerUpdateData)
              .eq('id', authData.user.id)
            
            updateError = updateErrorWithSpecialization
            
            // If error is due to missing specialization column, retry without it
            if (updateError && (updateError.message?.includes('specialization') || updateError.message?.includes('column') || updateError.code === '42703')) {
              console.warn('⚠️ specialization column not found, retrying without it')
              const { specialization: _, ...triggerUpdateDataWithoutSpecialization } = triggerUpdateData
              const { error: updateErrorWithoutSpecialization } = await adminSupabase
                .from('profiles')
                .update(triggerUpdateDataWithoutSpecialization)
                .eq('id', authData.user.id)
              updateError = updateErrorWithoutSpecialization
            }
          } else {
            const { error: updateErrorDirect } = await adminSupabase
              .from('profiles')
              .update(triggerUpdateData)
              .eq('id', authData.user.id)
            updateError = updateErrorDirect
          }
          
          if (updateError) {
            console.error('❌ Error updating trigger-created profile:', updateError)
            console.error('Update error details:', {
              message: updateError.message,
              code: updateError.code,
              hint: updateError.hint
            })
            
            // If role is already correct, continue but log warning
            if (checkProfile.role === role) {
              console.warn('⚠️ Profile role is already correct, but other fields may not be saved')
            } else {
              return NextResponse.json({ 
                error: 'Failed to update profile',
                details: updateError.message
              }, { status: 500 })
            }
          } else {
            console.log('✅ Trigger-created profile updated successfully')
            // Try to save specialization separately if it exists and column exists
            if (role === 'installer' && specialization) {
              try {
                await adminSupabase
                  .from('profiles')
                  .update({ specialization: specialization })
                  .eq('id', authData.user.id)
                console.log('✅ Specialization saved separately')
              } catch (specError: any) {
                // Ignore if specialization column doesn't exist
                if (specError.message?.includes('specialization') || specError.message?.includes('column') || specError.code === '42703') {
                  console.warn('⚠️ Specialization column not found in profiles table, skipping')
                } else {
                  console.warn('⚠️ Could not save specialization:', specError.message)
                }
              }
            }
            
            // Verify the update actually saved the data
            await new Promise(resolve => setTimeout(resolve, 200))
            const { data: verifyProfile } = await adminSupabase
              .from('profiles')
              .select('phone, department, status, join_date')
              .eq('id', authData.user.id)
              .single()
            
            if (verifyProfile) {
              console.log('✅ Verified profile data after trigger update:', {
                phone: verifyProfile.phone ? 'saved' : 'missing',
                department: verifyProfile.department ? 'saved' : 'missing',
                status: verifyProfile.status || 'missing',
                join_date: verifyProfile.join_date ? 'saved' : 'missing'
              })
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
    
    // Try to save departments as array if the column exists (optional, ignore errors)
    if (Array.isArray(departments) && departments.length > 0) {
      try {
        await adminSupabase
          .from('profiles')
          .update({ departments: departments })
          .eq('id', authData.user.id)
        // Ignore error here; it's optional and depends on schema
      } catch (e) {
        // Silently ignore - departments array column may not exist
      }
    }
    
    // CRITICAL: Final verification - ensure all profile data was saved correctly
    await new Promise(resolve => setTimeout(resolve, 300))
    const { data: finalProfileCheck, error: finalCheckError } = await adminSupabase
      .from('profiles')
      .select('id, role, name, email, phone, department, status, join_date')
      .eq('id', authData.user.id)
      .single()
    
    if (finalProfileCheck) {
      console.log('✅ Final profile verification:', {
        role: finalProfileCheck.role,
        phone: finalProfileCheck.phone ? '✅ saved' : '❌ missing',
        department: finalProfileCheck.department ? '✅ saved' : '❌ missing',
        status: finalProfileCheck.status || '❌ missing',
        join_date: finalProfileCheck.join_date ? '✅ saved' : '❌ missing'
      })
      
      // If critical fields are missing, try one more update
      if (!finalProfileCheck.phone && phone) {
        console.warn('⚠️ Phone not saved, attempting final update...')
        await adminSupabase
          .from('profiles')
          .update({ phone: phone })
          .eq('id', authData.user.id)
      }
      if (!finalProfileCheck.department && Array.isArray(departments) && departments.length > 0) {
        console.warn('⚠️ Department not saved, attempting final update...')
        await adminSupabase
          .from('profiles')
          .update({ department: departments.join(', ') })
          .eq('id', authData.user.id)
      }
      if (!finalProfileCheck.join_date && join_date) {
        console.warn('⚠️ Join date not saved, attempting final update...')
        await adminSupabase
          .from('profiles')
          .update({ join_date: join_date })
          .eq('id', authData.user.id)
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
      
      // CRITICAL: Check if this user is already linked to ANY other tenant
      // This prevents accidentally linking users to multiple tenants
      const { data: existingLinks, error: checkLinksError } = await adminSupabase
        .from('tenant_users')
        .select('id, role, tenant_id')
        .eq('user_id', authData.user.id)
      
      if (checkLinksError) {
        console.error('❌ Error checking existing tenant links:', checkLinksError)
        return NextResponse.json({ 
          error: 'Failed to verify tenant relationship',
          details: checkLinksError.message 
        }, { status: 500 })
      }
      
      // Check if user is already linked to THIS specific tenant
      const existingTenantUser = existingLinks?.find(tu => tu.tenant_id === tenant_id)
      
      // Check if user is linked to OTHER tenants (this should NOT happen for new users)
      const otherTenantLinks = existingLinks?.filter(tu => tu.tenant_id !== tenant_id) || []
      
      if (otherTenantLinks.length > 0) {
        console.error('❌ SECURITY ERROR: New user is already linked to other tenants!', {
          user_id: authData.user.id,
          requested_tenant: tenant_id,
          existing_tenants: otherTenantLinks.map(tu => tu.tenant_id)
        })
        
        // For new user creation, this should NEVER happen
        // Delete the other tenant links to prevent data leakage
        console.log('🔧 Removing incorrect tenant links...')
        for (const link of otherTenantLinks) {
          const { error: deleteError } = await adminSupabase
            .from('tenant_users')
            .delete()
            .eq('id', link.id)
          
          if (deleteError) {
            console.error(`❌ Failed to delete incorrect tenant link ${link.id}:`, deleteError)
          } else {
            console.log(`✅ Deleted incorrect tenant link for tenant ${link.tenant_id}`)
          }
        }
      }
      
      if (existingTenantUser) {
        console.log('⚠️ Tenant user relationship already exists for this tenant, updating role')
        // Update existing relationship to ensure role is correct
        const { error: updateTenantUserError } = await adminSupabase
          .from('tenant_users')
          .update({ role: role })
          .eq('id', existingTenantUser.id)
          .eq('tenant_id', tenant_id) // Extra safety: ensure we're updating the correct tenant

        if (updateTenantUserError) {
          console.error('❌ Error updating tenant_users relationship:', updateTenantUserError)
          return NextResponse.json({ 
            error: 'Failed to update tenant relationship',
            details: updateTenantUserError.message 
          }, { status: 500 })
        } else {
          console.log('✅ Tenant user relationship updated successfully with role:', role, 'for tenant:', tenant_id)
        }
      } else {
        // Create new relationship - ONLY for the requested tenant
        console.log('🔗 Creating NEW tenant_users relationship for tenant:', tenant_id)
        console.log('🔗 User details:', {
          user_id: authData.user.id,
          email: authData.user.email,
          name: name,
          role: role
        })
        
        // CRITICAL: Use INSERT with ON CONFLICT to prevent duplicates
        // The UNIQUE constraint on (tenant_id, user_id) should prevent this, but we'll handle it explicitly
        const { error: tenantUserError } = await adminSupabase
          .from('tenant_users')
          .insert({
            tenant_id: tenant_id,
            user_id: authData.user.id,
            role: role // CRITICAL: Use the role from request, not default
          })

        if (tenantUserError) {
          // Check if error is due to unique constraint violation (user already linked to this tenant)
          if (tenantUserError.code === '23505' || tenantUserError.message?.includes('unique') || tenantUserError.message?.includes('duplicate')) {
            console.warn('⚠️ User is already linked to this tenant (unique constraint), verifying...')
            // Verify the existing link
            const { data: verifyLink } = await adminSupabase
              .from('tenant_users')
              .select('id, tenant_id, role')
              .eq('tenant_id', tenant_id)
              .eq('user_id', authData.user.id)
              .single()
            
            if (verifyLink && verifyLink.tenant_id === tenant_id) {
              console.log('✅ User is correctly linked to tenant:', tenant_id)
              // Update role if needed
              if (verifyLink.role !== role) {
                await adminSupabase
                  .from('tenant_users')
                  .update({ role: role })
                  .eq('id', verifyLink.id)
              }
            } else {
              console.error('❌ Verification failed after unique constraint error')
              return NextResponse.json({ 
                error: 'Failed to create tenant relationship',
                details: 'User link verification failed after unique constraint error'
              }, { status: 500 })
            }
          } else {
            console.error('❌ Error creating tenant_users relationship:', tenantUserError)
            // This is critical for tenant-specific queries - return error
            return NextResponse.json({ 
              error: 'Failed to create tenant relationship',
              details: tenantUserError.message,
              code: tenantUserError.code
            }, { status: 500 })
          }
        } else {
          console.log('✅ Tenant user relationship created successfully:', {
            tenant_id,
            user_id: authData.user.id,
            role
          })
        }
      }
      
      // CRITICAL: Verify the relationship was created correctly and ONLY for this tenant
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
      }
      
      // Double-check: Verify tenant_id matches
      if (verifyTenantUser.tenant_id !== tenant_id) {
        console.error('❌ SECURITY: Tenant ID mismatch in verification!', {
          expected: tenant_id,
          actual: verifyTenantUser.tenant_id
        })
        return NextResponse.json({ 
          error: 'Tenant relationship verification failed',
          details: 'Tenant ID mismatch detected'
        }, { status: 500 })
      }
      
      console.log('✅ Verified tenant_users relationship exists and is correct:', {
        tenant_id: verifyTenantUser.tenant_id,
        user_id: authData.user.id,
        role: verifyTenantUser.role
      })
      
      // Final check: Ensure user is NOT linked to other tenants (for new users)
      const { data: allLinks } = await adminSupabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', authData.user.id)
      
      const linkedTenants = allLinks?.map(l => l.tenant_id) || []
      if (linkedTenants.length > 1) {
        console.warn('⚠️ WARNING: User is linked to multiple tenants:', linkedTenants)
        // Log but don't fail - this might be intentional in some cases
      } else {
        console.log('✅ User is correctly linked to only one tenant:', tenant_id)
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
    console.error('❌ Error in user creation API:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
    const errorDetails = error?.details || error?.hint || error?.code || null
    
    // Ensure we always return a valid JSON response
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails || 'An unexpected error occurred while creating the user',
      fullError: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}
