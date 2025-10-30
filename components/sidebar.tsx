'use client'

import { useState, useEffect } from 'react'
import { UserRole, getNavigationItems } from '@/lib/rbac'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Car, Truck, Activity, DollarSign, Settings, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  userRole: UserRole
}

// Icon mapping for navigation items
const iconMap: Record<string, any> = {
  Dashboard: LayoutDashboard,
  'Vehicle Inward': Car,
  Vehicles: Truck,
  Trackers: Activity,
  Accounts: DollarSign,
  Settings: Settings,
  'User Management': Users,
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState('R S Cars • Nagpur')
  const [companyLocation, setCompanyLocation] = useState('Nagpur')
  const supabase = createClient()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    loadCompanySettings()
    const onResize = () => setIsMobile(window.innerWidth <= 640)
    onResize()
    window.addEventListener('resize', onResize)
    
    // Set up real-time subscription for company settings
    const channel = supabase
      .channel('company-settings-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'setting_group=eq.company' },
        () => {
          loadCompanySettings()
        }
      )
      .subscribe()

    // Listen for custom events when settings are updated
    const handleCompanyUpdate = () => {
      loadCompanySettings()
    }
    window.addEventListener('company-settings-updated', handleCompanyUpdate)
    window.addEventListener('storage', handleCompanyUpdate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('company-settings-updated', handleCompanyUpdate)
      window.removeEventListener('storage', handleCompanyUpdate)
    }
  }, [])

  const loadCompanySettings = async () => {
    try {
      // Load company name and location from system_settings
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['company_name', 'company_address'])
        .in('setting_group', ['company'])
      
      if (data) {
        const nameSetting = data.find(s => s.setting_key === 'company_name')
        const addressSetting = data.find(s => s.setting_key === 'company_address')
        
        if (nameSetting?.setting_value) {
          setCompanyName(nameSetting.setting_value)
          localStorage.setItem('companyName', nameSetting.setting_value)
        }
        
        // Extract location from address if available
        if (addressSetting?.setting_value) {
          const address = addressSetting.setting_value
          // Try to extract city/location from address (look for city before state)
          // Match pattern like "..., Nagpur, Maharashtra"
          const parts = address.split(',')
          if (parts.length >= 2) {
            // Usually city is second to last (before state/pincode)
            const city = parts[parts.length - 2].trim()
            if (city) {
              setCompanyLocation(city)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  // Get role-based navigation items
  const navigationItems = getNavigationItems(userRole)

  return (
    <div style={{ 
      width: isMobile ? '72px' : '260px', 
      backgroundColor: '#0f172a', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
    }}>
      {/* Logo */}
      <div style={{ 
        padding: isMobile ? '1rem' : '1.5rem', 
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: 'white', marginBottom: isMobile ? 0 : '0.25rem', textAlign: isMobile ? 'center' : 'left' }}>
          {isMobile ? 'ZO' : 'Zoravo OMS'}
        </div>
        {!isMobile && (
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
            {companyName}
            {companyLocation && companyName !== companyLocation && !companyName.includes(companyLocation) && ` • ${companyLocation}`}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: isMobile ? '0.25rem' : '0.5rem', overflow: 'auto' }}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = iconMap[item.title] || LayoutDashboard
          
          return (
            <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0' : '0.75rem',
                padding: isMobile ? '0.75rem 0.5rem' : '0.875rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.25rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s',
                backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem' }}>
                  <Icon style={{ width: '1.25rem', height: '1.25rem' }} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {!isMobile && <span>{item.title}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div style={{ 
        padding: isMobile ? '0.75rem' : '1rem 1.5rem', 
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(15, 23, 42, 0.8)'
      }}>
        <div style={{ 
          padding: isMobile ? '0.5rem' : '0.75rem', 
          backgroundColor: 'rgba(37, 99, 235, 0.1)', 
          borderRadius: '0.5rem',
          border: '1px solid rgba(96, 165, 250, 0.2)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
            Logged in as
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', textTransform: 'capitalize', textAlign: isMobile ? 'center' : 'left' }}>
            {userRole}
          </div>
        </div>
      </div>
    </div>
  )
}