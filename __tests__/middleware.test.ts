import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

// Mock NextResponse
const mockNextResponse = {
  next: vi.fn(() => ({
    headers: {
      set: vi.fn(),
    },
  })),
  redirect: vi.fn(),
}

vi.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}))

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
  })

  describe('Authentication Flow', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/dashboard')
      await middleware(request)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://localhost:3000/login?redirectTo=%2Fdashboard',
        })
      )
    })

    it('should redirect authenticated users away from login', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/login')
      await middleware(request)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://localhost:3000/dashboard',
        })
      )
    })

    it('should redirect to original destination after login', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/login?redirectTo=%2Fvehicles%2F123')
      await middleware(request)

      expect(mockNextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({
          href: 'http://localhost:3000/vehicles/123',
        })
      )
    })
  })

  describe('Static Assets', () => {
    it('should allow static assets without authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const staticRoutes = [
        '/_next/static/chunk.js',
        '/_next/image/test.jpg',
        '/favicon.ico',
        '/api/auth/callback',
        '/api/health',
        '/test.png',
        '/test.svg',
      ]

      for (const route of staticRoutes) {
        const request = new NextRequest(`http://localhost:3000${route}`)
        await middleware(request)
        
        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      }
    })
  })

  describe('Role Headers', () => {
    it('should add role header for authenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'manager' },
        error: null,
      })

      const mockResponse = {
        headers: {
          set: vi.fn(),
        },
      }

      mockNextResponse.next.mockReturnValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/dashboard')
      await middleware(request)

      expect(mockResponse.headers.set).toHaveBeenCalledWith('x-role', 'manager')
      expect(mockResponse.headers.set).toHaveBeenCalledWith('x-user-id', 'user-123')
    })

    it('should not add role header for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const mockResponse = {
        headers: {
          set: vi.fn(),
        },
      }

      mockNextResponse.next.mockReturnValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/login')
      await middleware(request)

      expect(mockResponse.headers.set).not.toHaveBeenCalled()
    })

    it('should handle role fetch errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockRejectedValue(
        new Error('Database error')
      )

      const mockResponse = {
        headers: {
          set: vi.fn(),
        },
      }

      mockNextResponse.next.mockReturnValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/dashboard')
      await middleware(request)

      expect(mockResponse.headers.set).not.toHaveBeenCalled()
    })
  })

  describe('Route Protection', () => {
    it('should protect dashboard routes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const protectedRoutes = [
        '/dashboard',
        '/inward',
        '/vehicles',
        '/trackers',
        '/accounts',
        '/settings',
      ]

      for (const route of protectedRoutes) {
        const request = new NextRequest(`http://localhost:3000${route}`)
        await middleware(request)
        
        expect(mockNextResponse.redirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: `http://localhost:3000/login?redirectTo=${encodeURIComponent(route)}`,
          })
        )
      }
    })

    it('should allow access to protected routes for authenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      })

      const mockResponse = {
        headers: {
          set: vi.fn(),
        },
      }

      mockNextResponse.next.mockReturnValue(mockResponse)

      const request = new NextRequest('http://localhost:3000/dashboard')
      await middleware(request)

      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(mockResponse.headers.set).toHaveBeenCalledWith('x-role', 'admin')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing environment variables', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const request = new NextRequest('http://localhost:3000/dashboard')
      
      // Should not throw an error
      await expect(middleware(request)).resolves.not.toThrow()
    })

    it('should handle malformed URLs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('invalid-url')
      await middleware(request)

      expect(mockNextResponse.redirect).toHaveBeenCalled()
    })

    it('should handle API auth routes correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const apiAuthRoutes = [
        '/api/auth/callback',
        '/api/auth/signin',
        '/api/auth/signout',
      ]

      for (const route of apiAuthRoutes) {
        const request = new NextRequest(`http://localhost:3000${route}`)
        await middleware(request)
        
        expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      }
    })
  })
})
