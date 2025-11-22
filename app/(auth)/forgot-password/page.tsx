'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Mail, ArrowLeft, UserPlus } from 'lucide-react'
import Logo from '@/components/Logo'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  )
}

function ForgotPasswordContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailNotFound, setEmailNotFound] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setEmailNotFound(false)
    setSuccess(false)

    try {
      if (!email) {
        setError('Please enter your email address')
        setLoading(false)
        return
      }

      // First, check if the email exists in the system
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const checkData = await checkResponse.json()

      if (!checkData.exists) {
        // Email not found - show friendly message with option to create account
        setEmailNotFound(true)
        setLoading(false)
        return
      }

      // Email exists - proceed with password reset
      // Get the current site URL for redirect
      const siteUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

      // Call Supabase resetPasswordForEmail
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message || 'Failed to send password reset email')
        setLoading(false)
        return
      }

      // Success - show success message
      setSuccess(true)
      setLoading(false)
    } catch (err: any) {
      console.error('Password reset error:', err)
      setError(err.message || 'An unexpected error occurred')
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
        {/* Back to Login */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.5rem 0.75rem',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              color: '#2563eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            Back to Login
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

        {/* Forgot Password Card */}
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
              Forgot Password?
            </h2>
            <p style={{
              textAlign: 'center',
              color: '#6b7280',
              margin: '0',
              fontSize: '0.875rem'
            }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#166534',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <CheckCircle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  Check your email
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                  We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and click the link to reset your password.
                </div>
              </div>
            </div>
          )}

          {/* Email Not Found Message */}
          {emailNotFound && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              color: '#92400e',
              fontSize: '0.875rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                    Account Not Found
                  </div>
                  <div style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>
                    We couldn't find an account associated with <strong>{email}</strong>. This email address is not registered in our system.
                  </div>
                  <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
                    borderRadius: '0.375rem',
                    marginTop: '0.75rem'
                  }}>
                    <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Don't have an account yet?
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/?createAccount=true')}
                      style={{
                        width: '100%',
                        padding: '0.625rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s',
                        marginTop: '0.5rem'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                      <UserPlus style={{ width: '1rem', height: '1rem' }} />
                      Create New Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !success && !emailNotFound && (
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

          {/* Form */}
          {!success && !emailNotFound && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Email address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af'
                  }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    style={{
                      width: '100%',
                      height: '3rem',
                      padding: '0 1rem 0 2.75rem',
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail style={{ width: '1rem', height: '1rem' }} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          )}

          {success && (
            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                height: '3rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: 'white',
                fontWeight: '500',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              Back to Login
            </button>
          )}
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

