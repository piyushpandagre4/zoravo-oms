'use client'

import { useState, useEffect, Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Car, AlertCircle, Building2, User, Key } from 'lucide-react'
import Logo from '@/components/Logo'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [loginMode, setLoginMode] = useState<'tenant' | 'super'>('tenant') // 'tenant' or 'super'
  const [tenantCode, setTenantCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTenantSelection, setShowTenantSelection] = useState(false)
  const [userTenants, setUserTenants] = useState<any[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const tenantParam = searchParams.get('tenant')

  useEffect(() => {
    // Pre-fill tenant code from query parameter
    if (tenantParam) {
      setTenantCode(tenantParam.toUpperCase())
    }
  }, [tenantParam])

  const handleTenantLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!tenantCode || !email || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      // First, authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Authentication failed')
        setLoading(false)
        return
      }

      // Get tenant by tenant code
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, workspace_url, tenant_code, is_active')
        .eq('tenant_code', tenantCode.toUpperCase())
        .single()

      if (tenantError || !tenant) {
        await supabase.auth.signOut()
        setError('Tenant not found. Please check your tenant number.')
        setLoading(false)
        return
      }

      // Check if user is admin - admins can access even when tenant is inactive
      const { data: tenantUserCheck } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', tenant.id)
        .eq('user_id', authData.user.id)
        .single()

      const isAdmin = tenantUserCheck?.role === 'admin'

      // If tenant is inactive, only admins can access
      if (!tenant.is_active && !isAdmin) {
        await supabase.auth.signOut()
        setError('This account is currently inactive. Only administrators can access inactive accounts. Please contact your admin or support.')
        setLoading(false)
        return
      }

      // Check if user belongs to this tenant
      const { data: tenantUser, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('user_id', authData.user.id)
        .single()

      if (tenantUserError || !tenantUser) {
        await supabase.auth.signOut()
        setError('You do not have access to this tenant.')
        setLoading(false)
        return
      }

      // Store tenant context in session storage
      sessionStorage.setItem('current_tenant_id', tenant.id)
      sessionStorage.setItem('current_workspace_url', tenant.workspace_url)
      sessionStorage.setItem('current_tenant_code', tenant.tenant_code || '')

      router.push(redirectTo)
      router.refresh()
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleSuperLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!email || !password) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      // Authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Authentication failed')
        setLoading(false)
        return
      }

      // Check if user is admin in RS Car Accessories tenant (default tenant)
      const RS_CAR_ACCESSORIES_TENANT_ID = '00000000-0000-0000-0000-000000000001'
      
      // Check if user is in super_admins table first
      const { data: superAdmin, error: superAdminError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle() // Use maybeSingle() instead of single() to avoid error if not found

      // Check if user is admin in RS Car Accessories tenant
      const { data: rsCarAdmin, error: rsCarAdminError } = await supabase
        .from('tenant_users')
        .select('role, tenant_id, tenants(id, name, workspace_url)')
        .eq('user_id', authData.user.id)
        .eq('tenant_id', RS_CAR_ACCESSORIES_TENANT_ID)
        .eq('role', 'admin')
        .maybeSingle() // Use maybeSingle() instead of single() to avoid error if not found

      // If user is admin in RS Car Accessories, grant super admin access
      const isSuperAdmin = !superAdminError && !!superAdmin
      const isRSCarAdmin = !rsCarAdminError && !!rsCarAdmin && rsCarAdmin.role === 'admin'

      // Log for debugging
      console.log('Super Admin Check:', {
        isSuperAdmin,
        isRSCarAdmin,
        superAdminError: superAdminError?.message,
        rsCarAdminError: rsCarAdminError?.message
      })

      if (!isSuperAdmin && !isRSCarAdmin) {
        // Check if user has any tenant access
        const { data: tenantUsers } = await supabase
          .from('tenant_users')
          .select('tenant_id, role, tenants(id, name, workspace_url)')
          .eq('user_id', authData.user.id)

        if (tenantUsers && tenantUsers.length > 0) {
          // User has tenant access - show tenant selection
          const tenants = tenantUsers.map((tu: any) => {
            // Handle tenants as either object or array
            const tenantData = Array.isArray(tu.tenants) ? tu.tenants[0] : tu.tenants
            return {
              id: tenantData?.id,
              name: tenantData?.name,
              workspace_url: tenantData?.workspace_url,
              role: tu.role
            }
          }).filter((t: any) => t.id) // Filter out any null/undefined entries

          setUserTenants(tenants)
          setShowTenantSelection(true)
          setLoading(false)
          return
        }

        await supabase.auth.signOut()
        setError('You do not have super admin access.')
        setLoading(false)
        return
      }

      // User is super admin (either via super_admins table or RS Car Accessories admin)
      // Show tenant selection with RS Car Accessories and ZORAVO Admin options
      const { data: allTenantUsers } = await supabase
        .from('tenant_users')
        .select('tenant_id, role, tenants(id, name, workspace_url)')
        .eq('user_id', authData.user.id)

      const tenants: any[] = []
      
      // Add RS Car Accessories tenant
      if (allTenantUsers) {
        const rsCarTenant = allTenantUsers.find((tu: any) => tu.tenant_id === RS_CAR_ACCESSORIES_TENANT_ID)
        if (rsCarTenant && rsCarTenant.tenants) {
          // Handle tenants as either object or array
          const tenantData = Array.isArray(rsCarTenant.tenants) ? rsCarTenant.tenants[0] : rsCarTenant.tenants
          if (tenantData) {
            tenants.push({
              id: tenantData.id,
              name: tenantData.name,
              workspace_url: tenantData.workspace_url,
              role: rsCarTenant.role
            })
          }
        } else {
          // Add default RS Car Accessories tenant
          tenants.push({
            id: RS_CAR_ACCESSORIES_TENANT_ID,
            name: 'RS Car Accessories • Nagpur',
            workspace_url: 'rs-car-accessories-nagpur',
            role: 'admin'
          })
        }
      } else {
        // Add default RS Car Accessories tenant
        tenants.push({
          id: RS_CAR_ACCESSORIES_TENANT_ID,
          name: 'RS Car Accessories • Nagpur',
          workspace_url: 'rs-car-accessories-nagpur',
          role: 'admin'
        })
      }

      // Add ZORAVO Admin option
      tenants.push({
        id: 'admin',
        name: 'ZORAVO Admin',
        workspace_url: 'admin',
        role: 'super_admin',
        is_admin: true
      })

      setUserTenants(tenants)
      setShowTenantSelection(true)
      setLoading(false)
    } catch (err: any) {
      console.error('Super login error:', err)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleTenantSelect = (tenant: any) => {
    if (tenant.is_admin || tenant.id === 'admin') {
      // ZORAVO Admin selected
      sessionStorage.setItem('is_super_admin', 'true')
      router.push('/admin')
    } else {
      // Regular tenant selected
      sessionStorage.setItem('current_tenant_id', tenant.id)
      sessionStorage.setItem('current_workspace_url', tenant.workspace_url)
      sessionStorage.removeItem('is_super_admin')
      
      if (tenant.workspace_url === 'rs-car-accessories-nagpur') {
        router.push('/dashboard')
      } else {
        router.push(`/dashboard?tenant=${tenant.id}`)
      }
    }
    router.refresh()
  }

  if (showTenantSelection) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '1rem',
              color: '#1f2937'
            }}>
              Select Workspace
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              You have access to multiple workspaces. Please select one to continue.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {userTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSelect(tenant)}
                  style={{
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb'
                    e.currentTarget.style.backgroundColor = '#f0f9ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                    {tenant.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {tenant.workspace_url}.zoravo.com
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowTenantSelection(false)
                supabase.auth.signOut()
              }}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '28rem', width: '100%' }}>
        {/* Back to Home */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              color: '#2563eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            ← Back to Home
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <Logo size="large" showText={true} variant="dark" />
          </div>
        </div>

        {/* Login Mode Toggle */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f3f4f6',
          padding: '0.25rem',
          borderRadius: '0.5rem'
        }}>
          <button
            onClick={() => setLoginMode('tenant')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.375rem',
              backgroundColor: loginMode === 'tenant' ? 'white' : 'transparent',
              color: loginMode === 'tenant' ? '#2563eb' : '#6b7280',
              fontWeight: loginMode === 'tenant' ? '600' : '400',
              cursor: 'pointer',
              boxShadow: loginMode === 'tenant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <Building2 style={{ width: '1rem', height: '1rem' }} />
            Tenant Login
          </button>
          <button
            onClick={() => setLoginMode('super')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.375rem',
              backgroundColor: loginMode === 'super' ? 'white' : 'transparent',
              color: loginMode === 'super' ? '#2563eb' : '#6b7280',
              fontWeight: loginMode === 'super' ? '600' : '400',
              cursor: 'pointer',
              boxShadow: loginMode === 'super' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <Key style={{ width: '1rem', height: '1rem' }} />
            Super Admin
          </button>
        </div>

        {/* Login Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              textAlign: 'center',
              margin: '0 0 0.5rem 0',
              color: '#1f2937'
            }}>
              {loginMode === 'tenant' ? 'Sign In to Your Workspace' : 'Super Admin Login'}
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              margin: '0',
              fontSize: '0.875rem'
            }}>
              {loginMode === 'tenant' 
                ? 'Enter your tenant number and credentials'
                : 'Access ZORAVO Admin Dashboard'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle style={{ width: '1rem', height: '1rem' }} />
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={loginMode === 'tenant' ? handleTenantLogin : handleSuperLogin}>
            {loginMode === 'tenant' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Tenant Number *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    required
                    placeholder="Z01"
                    maxLength={3}
                    style={{
                      flex: 1,
                      height: '3rem',
                      padding: '0 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      fontWeight: '600',
                      letterSpacing: '0.1em'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Enter your tenant number (e.g., Z01, Z02, Z03)
                </p>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                style={{
                  width: '100%',
                  height: '3rem',
                  padding: '0 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  height: '3rem',
                  padding: '0 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '3rem',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: 'white',
                fontWeight: '500',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
