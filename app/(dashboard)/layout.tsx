'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import Topbar from '@/components/topbar'
import { createClient } from '@/lib/supabase/client'
import { checkUserRole, type UserRole } from '@/lib/rbac'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userRole, setUserRole] = useState<UserRole>('admin')
  const [userName, setUserName] = useState('Demo Admin')
  const [userEmail, setUserEmail] = useState('raghav@sunkool.in')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
    
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
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Get user from auth
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
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
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar userRole={userRole} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!loading && (
          <Topbar 
            userRole={userRole}
            userName={userName}
            userEmail={userEmail}
          />
        )}
        <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
