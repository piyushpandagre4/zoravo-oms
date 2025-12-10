import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Link a user to a tenant
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { user_id, tenant_id, role } = body

    if (!user_id || !tenant_id || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: user_id, tenant_id, role' 
      }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Validate that user exists in auth.users
    const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(user_id)
    if (authUserError || !authUser) {
      console.error('User not found in auth.users:', authUserError)
      return NextResponse.json({ 
        error: 'User not found',
        details: authUserError?.message || 'User does not exist in auth.users'
      }, { status: 404 })
    }

    // Validate that tenant exists
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .maybeSingle()

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError)
      return NextResponse.json({ 
        error: 'Tenant not found',
        details: tenantError?.message || 'Tenant does not exist'
      }, { status: 404 })
    }

    console.log('Linking user to tenant:', { user_id, tenant_id, role, tenant_name: tenant.name })

    // Check if relationship already exists
    const { data: existing } = await adminSupabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      // Update existing relationship
      const { error: updateError } = await adminSupabase
        .from('tenant_users')
        .update({ role })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Error updating tenant_users:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update tenant relationship',
          details: updateError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Tenant relationship updated',
        action: 'updated'
      })
    } else {
      // Create new relationship
      const { error: insertError } = await adminSupabase
        .from('tenant_users')
        .insert({
          tenant_id,
          user_id,
          role
        })

      if (insertError) {
        console.error('Error creating tenant_users:', insertError)
        console.error('Insert error details:', JSON.stringify(insertError, null, 2))
        return NextResponse.json({ 
          error: 'Failed to create tenant relationship',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'User linked to tenant successfully',
        action: 'created'
      })
    }
  } catch (error: any) {
    console.error('Error in link-to-tenant API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

