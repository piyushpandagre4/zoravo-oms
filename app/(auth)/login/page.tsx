'use client'

import { useState, useEffect, Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Car, AlertCircle } from 'lucide-react'
import Logo from '@/components/Logo'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [companyName, setCompanyName] = useState('Zoravo OMS')
  const [companySubtitle, setCompanySubtitle] = useState('R S Cars - Nagpur Management System')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      setDemoMode(true)
    }
    // Load company name from localStorage immediately for snappy UI
    const cached = localStorage.getItem('companyName')
    if (cached) setCompanyName(cached)

    // Fetch from system_settings to ensure correctness
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['company_name', 'company_tagline'])
        if (!error && data) {
          const name = data.find(s => s.setting_key === 'company_name')?.setting_value
          const tagline = data.find(s => s.setting_key === 'company_tagline')?.setting_value
          if (name) {
            setCompanyName(name)
            localStorage.setItem('companyName', name)
          }
          if (tagline) setCompanySubtitle(tagline)
        }
      } catch {}
    })()

    // Listen to settings changes
    const onUpdated = () => {
      const updated = localStorage.getItem('companyName')
      if (updated) setCompanyName(updated)
    }
    window.addEventListener('company-settings-updated', onUpdated)
    return () => window.removeEventListener('company-settings-updated', onUpdated)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (demoMode) {
        // Demo mode - simulate login
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check demo credentials
        const validCredentials = [
          { email: 'raghav@sunkool.in', password: 'Admin123', role: 'admin' },
          { email: 'manager@zoravo.com', password: 'manager123', role: 'manager' },
          { email: 'coordinator@zoravo.com', password: 'coordinator123', role: 'coordinator' },
        ]
        
        const validCred = validCredentials.find(cred => 
          cred.email === email && cred.password === password
        )
        
        if (validCred) {
          // Store demo user in cookie
          const demoUser = {
            id: 'demo-' + validCred.role,
            email: validCred.email,
            role: validCred.role,
            name: validCred.role.charAt(0).toUpperCase() + validCred.role.slice(1)
          }
          
          document.cookie = `demo-user=${JSON.stringify(demoUser)}; path=/; max-age=86400` // 24 hours
          
          router.push(redirectTo)
          router.refresh()
        } else {
          setError('Invalid email or password. Please use the demo credentials.')
        }
        return
      }

      // Check if Supabase is properly configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase configuration is missing. Please check your environment variables.')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in.')
        } else {
          setError(error.message)
        }
      } else if (data.user) {
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
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
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            fontWeight: '500',
            margin: '0'
          }}>
            {companyName}
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          border: 'none'
        }}>
          {/* Card Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              textAlign: 'center', 
              margin: '0 0 0.5rem 0',
              color: '#1f2937'
            }}>
              Welcome Back
            </h2>
            <p style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              margin: '0',
              fontSize: '0.875rem'
            }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Demo Mode Alert */}
          {demoMode && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#92400e',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '1.5rem'
            }}>
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', marginTop: '0.125rem', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: '500', margin: '0 0 0.25rem 0' }}>Demo Mode Active</p>
                <p style={{ margin: '0', fontSize: '0.75rem' }}>Supabase is not configured. Using demo credentials for testing.</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                alignItems: 'center'
              }}>
                <div style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  marginRight: '0.75rem'
                }}></div>
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
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

            {/* Password Field */}
            <div>
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

            {/* Submit Button */}
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
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.2)'
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                }
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

          {/* Demo credentials removed */}
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