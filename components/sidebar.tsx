'use client'

import { useState, useEffect } from 'react'
import { UserRole, getNavigationItems } from '@/lib/rbac'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Car, Truck, Activity, DollarSign, Settings, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { getCurrentTenantId } from '@/lib/tenant-context'

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
  const [companyName, setCompanyName] = useState('R S Cars')
  const [companyLocation, setCompanyLocation] = useState('')
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false)
  const supabase = createClient()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    loadCompanySettings()
    checkSubscriptionStatus()
    const onResize = () => setIsMobile(window.innerWidth <= 640)
    onResize()
    window.addEventListener('resize', onResize)
    
    const tenantId = getCurrentTenantId()
    
    // Set up real-time subscription for company settings
    const channel = supabase
      .channel('company-settings-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'setting_group=eq.company' },
        () => {
          loadCompanySettings()
        }
      )
    
    // Subscribe to tenants table changes for the current tenant
    if (tenantId) {
      channel.on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` },
        () => {
          loadCompanySettings()
        }
      )
    }
    
    channel.subscribe()

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

  const checkSubscriptionStatus = async () => {
    try {
      const tenantId = getCurrentTenantId()
      if (!tenantId) return

      const { data: tenantData } = await supabase
        .from('tenants')
        .select(`
          is_active,
          subscriptions(billing_period_end)
        `)
        .eq('id', tenantId)
        .single()

      if (tenantData?.subscriptions?.[0]?.billing_period_end) {
        const endDate = new Date(tenantData.subscriptions[0].billing_period_end)
        const now = new Date()
        setIsSubscriptionExpired(endDate < now)
      } else {
        // No subscription: 
        // - If tenant is active, treat as active (legacy tenant or manually activated)
        // - If tenant is inactive, treat as expired
        setIsSubscriptionExpired(!tenantData?.is_active)
      }
    } catch (error) {
      console.error('Error checking subscription status:', error)
    }
  }

  const loadCompanySettings = async () => {
    try {
      const tenantId = getCurrentTenantId()
      
      // If no tenant ID, try to load from system_settings (fallback for default tenant)
      if (!tenantId) {
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
          
          if (addressSetting?.setting_value) {
            const address = addressSetting.setting_value
            const parts = address.split(',')
            if (parts.length >= 2) {
              const city = parts[parts.length - 2].trim()
              if (city) {
                setCompanyLocation(city)
              }
            }
          }
        }
        return
      }
      
      // Load tenant-specific company name from tenants table
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, workspace_url')
        .eq('id', tenantId)
        .single()
      
      if (error) {
        console.error('Error loading tenant:', error)
        return
      }
      
      if (tenant) {
        // Set company name from tenant name - remove city suffix if present
        // If tenant name has "•" separator, use only the part before it
        const nameParts = tenant.name.split('•')
        const companyNameOnly = nameParts[0].trim()
        setCompanyName(companyNameOnly)
        localStorage.setItem('companyName', companyNameOnly)
        
        // Extract city from tenant name if present (e.g., "RS Car Accessories • Nagpur")
        if (nameParts.length > 1) {
          setCompanyLocation(nameParts[nameParts.length - 1].trim())
        } else {
          // Fallback: try to get from system_settings for this tenant
          const { data: settings } = await supabase
            .from('system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['company_address'])
            .eq('setting_group', 'company')
            .eq('tenant_id', tenantId)
          
          if (settings && settings.length > 0) {
            const address = settings[0].setting_value
            const parts = address.split(',')
            if (parts.length >= 2) {
              const city = parts[parts.length - 2].trim()
              if (city) {
                setCompanyLocation(city)
              }
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
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Logo Icon */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isMobile ? 'center' : 'flex-start' 
        }}>
          <Logo size="medium" showText={false} variant="light" />
        </div>
        
        {!isMobile && (
          <>
            {/* ZORAVO | OMS Text */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              <span>ZORAVO</span>
              <div style={{
                width: '2px',
                height: '1rem',
                backgroundColor: '#06b6d4',
                flexShrink: 0
              }} />
              <span style={{ fontWeight: '500' }}>OMS</span>
            </div>
            
            {/* Company Name - Only show company name, no city */}
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.4'
            }}>
              {companyName}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: isMobile ? '0.25rem' : '0.5rem', overflow: 'auto' }}>
        {navigationItems
          .filter(item => {
            // When subscription expired, only show Settings and About
            if (isSubscriptionExpired) {
              return item.href === '/settings' || item.href === '/about'
            }
            return true
          })
          .map((item) => {
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