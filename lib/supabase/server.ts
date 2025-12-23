import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

// Server client for server components and API routes
// Accepts optional cookieStore for backward compatibility with API routes
// If response is provided, cookies will be set on the response
// Note: In Next.js 15+, cookies() is async, but we keep this sync for backward compatibility
// For API routes, use createClientForRouteHandler() instead
export function createClient(
  cookieStoreOrResponse?: ReadonlyRequestCookies | NextResponse,
  response?: NextResponse
) {
  // Determine cookie store and response
  let cookieStore: ReadonlyRequestCookies
  let responseToUse: NextResponse | undefined = response
  
  if (cookieStoreOrResponse instanceof NextResponse) {
    // If first param is NextResponse, use it for setting cookies
    responseToUse = cookieStoreOrResponse
    // Note: This will cause a warning in Next.js 15+ but maintains backward compatibility
    // For new code, use createClientForRouteHandler() in API routes
    cookieStore = cookies() as any
  } else if (cookieStoreOrResponse) {
    // If cookieStore is provided, use it
    cookieStore = cookieStoreOrResponse
  } else {
    // Default: use cookies() from next/headers
    // Note: This will cause a warning in Next.js 15+ but maintains backward compatibility
    // For new code, use createClientForRouteHandler() in API routes
    cookieStore = cookies() as any
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? process.env.NODE_ENV === 'production',
                sameSite: options?.sameSite ?? 'lax',
                path: options?.path ?? '/',
              }
              
              // If we have a response object, set cookies on it (for API routes)
              if (responseToUse) {
                responseToUse.cookies.set(name, value, cookieOptions)
              } else {
                // Try to set on cookieStore (works in API routes with mutable cookies)
                // Check if cookieStore has a 'set' method (mutable RequestCookies)
                if (typeof (cookieStore as any).set === 'function') {
                  try {
                    (cookieStore as any).set(name, value, cookieOptions)
                  } catch (error) {
                    console.warn('Could not set cookies on cookieStore:', error)
                  }
                } else {
                  // ReadonlyRequestCookies - can't set cookies here
                  // This is expected in some contexts and safe to ignore
                  console.warn('Cannot set cookies: cookieStore is readonly. Use NextResponse for setting cookies in API routes.')
                }
              }
            })
          } catch (error) {
            // In some contexts (like during static generation), cookies can't be set
            // This is expected and safe to ignore
            console.warn('Could not set cookies in server component:', error)
          }
        },
      },
    }
  )
}

// Server client for API route handlers (uses NextRequest/NextResponse)
export function createClientForRouteHandler(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: options?.httpOnly ?? true,
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
              sameSite: options?.sameSite ?? 'lax',
              path: options?.path ?? '/',
            })
          })
        },
      },
    }
  )
}

// Legacy function for backward compatibility with API routes that pass cookieStore
// This is less ideal but maintains compatibility
export function createClientWithCookies(cookieStore?: ReadonlyRequestCookies) {
  if (!cookieStore) {
    // Fallback to default createClient if no cookieStore provided
    return createClient()
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Note: ReadonlyRequestCookies doesn't support setting cookies
          // This is a limitation when using this function
          // For proper cookie setting, use createClient() in server components
          // or createClientForRouteHandler() in API routes
          console.warn('Cannot set cookies with ReadonlyRequestCookies. Use createClient() or createClientForRouteHandler() instead.')
        },
      },
    }
  )
}
