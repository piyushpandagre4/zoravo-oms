import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Helper function to check if a route is protected (dashboard route)
function isProtectedRoute(pathname: string): boolean {
  // Protected routes: dashboard, admin, settings, and other app routes
  // Exclude: login, api, static files, public routes
  const protectedPaths = ['/dashboard', '/admin', '/settings', '/vehicles', '/invoices', '/trackers', '/requirements', '/installer', '/accountant']
  const excludedPaths = ['/login', '/api', '/_next', '/favicon.ico', '/reset-password', '/', '/about', '/pricing', '/forgot-password']
  
  // Check if it's a static file
  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)) {
    return false
  }
  
  // Check if it's an excluded path (public routes)
  // For exact matches like '/', check exact equality
  // For paths like '/login', check if pathname starts with the path
  if (excludedPaths.some(path => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname === path || pathname.startsWith(path + '/')
  })) {
    return false
  }
  
  // Check if it's a protected path
  return protectedPaths.some(path => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Create response object for Supabase auth refresh
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Handle Supabase auth cookie refresh
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
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

    // Refresh the session if needed
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    // If user exists, refresh the session to update tokens
    if (user) {
      const { error: sessionError } = await supabase.auth.getSession()
      // If session refresh fails, user session is expired
      if (sessionError) {
        // Only redirect dashboard routes (protected routes)
        if (isProtectedRoute(url.pathname)) {
          // Clear auth cookies
          response.cookies.delete('sb-access-token')
          response.cookies.delete('sb-refresh-token')
          // Redirect to login
          const loginUrl = url.clone()
          loginUrl.pathname = '/login'
          return NextResponse.redirect(loginUrl)
        }
      }
    } else if (authError) {
      // No user or auth error - redirect to login for protected routes only
      if (isProtectedRoute(url.pathname)) {
        // Clear auth cookies
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        // Redirect to login
        const loginUrl = url.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }
    }
  } catch (error) {
    // If auth refresh fails, check if it's a protected route
    console.warn('Auth refresh error in middleware:', error)
    // For protected routes, redirect to login on auth errors
    if (isProtectedRoute(url.pathname)) {
      const loginUrl = url.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Extract subdomain (workspace URL) from hostname
  // Examples:
  // - rs-car-accessories-nagpur.zoravo-oms.vercel.app → workspace: rs-car-accessories-nagpur
  // - zoravo-oms.vercel.app → no workspace (main domain)
  // - localhost:3000 → no workspace (development)
  
  const parts = hostname.split('.')
  let workspaceUrl: string | null = null
  
  // Check if we have a subdomain (more than 2 parts means subdomain exists)
  // For production: workspace.domain.com (3 parts)
  // For Vercel: workspace.project.vercel.app (4 parts)
  // For localhost: localhost:3000 (1 part, no subdomain)
  
  if (parts.length >= 3) {
    // Check if it's not a known domain pattern (like vercel.app, localhost, etc.)
    const knownDomains = ['vercel.app', 'localhost', '127.0.0.1']
    const domainPart = parts.slice(-2).join('.')
    
    if (!knownDomains.some(d => hostname.includes(d))) {
      // Custom domain or subdomain pattern
      workspaceUrl = parts[0]
    } else if (parts.length >= 4) {
      // Vercel pattern: workspace.project.vercel.app
      workspaceUrl = parts[0]
    }
  }
  
  // Skip workspace detection for public routes, admin routes, API routes, and static files
  const publicRoutes = ['/', '/login', '/about', '/pricing', '/forgot-password', '/reset-password']
  if (
    publicRoutes.includes(url.pathname) ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/favicon.ico') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return response
  }
  
  // If workspace URL is detected from subdomain, add it to headers and query params
  // Only do this for protected routes (dashboard routes)
  if (workspaceUrl && workspaceUrl !== 'www' && workspaceUrl !== 'app' && isProtectedRoute(url.pathname)) {
    // Add workspace URL to request headers for use in pages
    response.headers.set('x-workspace-url', workspaceUrl)
    
    // If not already in query params, add it
    if (!url.searchParams.has('workspace')) {
      url.searchParams.set('workspace', workspaceUrl)
      return NextResponse.redirect(url)
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (webpack hot module replacement)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}