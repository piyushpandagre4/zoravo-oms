import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return NextResponse.json({ 
        error: 'Server not configured',
        details: 'SUPABASE_SERVICE_ROLE_KEY not found in environment variables'
      }, { status: 500 })
    }

    const admin = createAdminClient()

    // Delete tenant_users relationships first (before deleting profile/auth)
    // This ensures clean deletion even if CASCADE doesn't work as expected
    const { error: tenantUsersError } = await admin
      .from('tenant_users')
      .delete()
      .eq('user_id', userId)
    
    if (tenantUsersError) {
      console.warn('Error deleting tenant_users relationships:', tenantUsersError.message)
      // Continue - tenant_users may have CASCADE or may not exist
    }

    // Delete profile row (should happen before auth delete)
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ 
        error: 'Failed to delete profile',
        details: profileError.message 
      }, { status: 400 })
    }

    // Delete from auth last (some environments may restrict this)
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) {
      // Continue best-effort - some environments restrict auth delete
      // Profile and tenant_users are already deleted, so this is acceptable
      console.warn('Auth delete failed (profile already deleted):', authError.message)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error in user deletion:', e)
    return NextResponse.json({ 
      error: e.message || 'Unknown error occurred',
      details: e.details || e.hint || null
    }, { status: 500 })
  }
}


