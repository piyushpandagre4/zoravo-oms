import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

// Simplified server client without cookies for now
export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for API routes
        },
      },
    }
  )
}
