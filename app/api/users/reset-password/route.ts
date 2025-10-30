import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Use admin client to update password
    const adminSupabase = createAdminClient()

    // Update the user's password
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      email, // Need to get user ID by email first
      { password: newPassword }
    )

    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error: any) {
    console.error('Error in password reset:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
