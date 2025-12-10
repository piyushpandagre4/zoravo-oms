import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use server client to check if user exists
    // cookies() in API routes returns mutable RequestCookies, so cookies can be set
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists in auth.users via profiles table
    // We check profiles because we can query it, and it has a 1:1 relationship with auth.users
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      console.error('Error checking email:', error)
      // If there's an error querying, we'll assume the email doesn't exist for security
      // This prevents email enumeration attacks
      return NextResponse.json({ exists: false })
    }

    // Return true if profile exists, false otherwise
    return NextResponse.json({ exists: !!profile })
  } catch (error: any) {
    console.error('Error in check-email route:', error)
    // On error, return false to be safe
    return NextResponse.json({ exists: false })
  }
}

