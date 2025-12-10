'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import SubscriptionGuard from '@/components/SubscriptionGuard'
import { createClient } from '@/lib/supabase/client'
import { checkUserRole, type UserRole } from '@/lib/rbac'
import { getWorkspaceUrl, initializeTenantFromWorkspace } from '@/lib/workspace-detector'

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  // Check if this is an admin route - if so, skip tenant layout
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Skip loading user data for admin routes - admin layout handles it
    if (isAdminRoute) {
      setLoading(false)
      return
    }

    // Initialize tenant context from workspace URL (subdomain or query param)
    const initializeTenant = async () => {
      const workspaceUrl = getWorkspaceUrl()
      if (workspaceUrl) {
        await initializeTenantFromWorkspace(workspaceUrl)
      }
    }
    
    initializeTenant().then(() => {
      loadUserData()
    })
    
    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('profile-updates-layout')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadUserData()
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings' },
        () => {
          loadUserData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdminRoute, searchParams])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Get user from auth - check session expiration
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      // If no user or auth error (expired session), redirect to login
      if (!user || authError) {
        console.log('Session expired or no user found, redirecting to login')
        // Clear any session storage
        if (typeof window !== 'undefined') {
          sessionStorage.clear()
        }
        // Sign out to clear any stale cookies
        await supabase.auth.signOut()
        // Redirect to login page
        router.push('/login')
        return
      }
      
      // Get profile data
      const profile = await checkUserRole()
      
      if (profile) {
        setUserRole(profile.role)
        setUserName(profile.name || user.user_metadata?.name || user.email || 'User')
        setUserEmail(user.email || '')
      } else {
        // Fallback to auth user metadata
        setUserName(user.user_metadata?.name || user.email || 'User')
        setUserEmail(user.email || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      // On error, redirect to login if we can't verify the user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (typeof window !== 'undefined') {
          sessionStorage.clear()
        }
        await supabase.auth.signOut()
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  // For admin routes, just render children - admin layout handles everything
  if (isAdminRoute) {
    return <>{children}</>
  }

  // For regular tenant routes, render with sidebar and topbar wrapped in SubscriptionGuard
  return (
    <SubscriptionGuard>
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        backgroundColor: '#f8fafc',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <Sidebar userRole={userRole} />
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          width: isMobile ? '100%' : 'auto'
        }}>
          {!loading && (
            <Topbar 
              userRole={userRole}
              userName={userName}
              userEmail={userEmail}
            />
          )}
          <main style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: isMobile ? '1rem' : '1.5rem' 
          }}>
            {children}
          </main>
        </div>
      </div>
    </SubscriptionGuard>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}
