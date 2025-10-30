import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, name, email, phone, password, designation, bio, joinDate } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'SUPABASE_SERVICE_ROLE_KEY not found' 
      }, { status: 500 })
    }

    const adminSupabase = createAdminClient()

    // Prepare update payload for auth user
    const authUpdatePayload: any = {}
    if (name) authUpdatePayload.user_metadata = { ...authUpdatePayload.user_metadata, name }
    if (email) authUpdatePayload.email = email
    if (password) authUpdatePayload.password = password

    // Update auth user
    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authError } = await adminSupabase.auth.admin.updateUserById(
        userId,
        authUpdatePayload
      )

      if (authError) {
        console.error('Error updating auth user:', authError)
        return NextResponse.json({ 
          error: 'Failed to update auth user',
          details: authError.message 
        }, { status: 400 })
      }
    }

    // Prepare update payload for profile
    const profileUpdatePayload: any = {}
    if (name) profileUpdatePayload.name = name
    if (email) profileUpdatePayload.email = email
    if (phone) profileUpdatePayload.phone = phone

    // Update profile table
    if (Object.keys(profileUpdatePayload).length > 0) {
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .update(profileUpdatePayload)
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        // Don't fail if profile update fails, auth update succeeded
      }
    }

    // Update system settings for profile
    const profileSettings = []
    if (designation !== undefined) {
      profileSettings.push({
        setting_key: 'profile_designation',
        setting_value: designation,
        setting_group: 'profile'
      })
    }
    if (bio !== undefined) {
      profileSettings.push({
        setting_key: 'profile_bio',
        setting_value: bio,
        setting_group: 'profile'
      })
    }
    if (joinDate !== undefined) {
      profileSettings.push({
        setting_key: 'profile_join_date',
        setting_value: joinDate,
        setting_group: 'profile'
      })
    }

    for (const setting of profileSettings) {
      await adminSupabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'setting_key' })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    })
  } catch (error: any) {
    console.error('Error in profile update:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

