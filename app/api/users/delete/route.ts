import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const admin = createAdminClient()

    // Delete from auth first
    const { error: authError } = await admin.auth.admin.deleteUser(userId)
    if (authError) {
      // Continue best-effort - some environments restrict auth delete; we still remove profile
      console.warn('Auth delete failed:', authError.message)
    }

    // Delete profile row
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId)
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 })
  }
}


