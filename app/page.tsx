'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Car, 
  Wrench, 
  Users, 
  BarChart3, 
  Shield, 
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  TrendingUp,
  Settings,
  FileText
} from 'lucide-react'
import Logo from '@/components/Logo'

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleDemoLogin = async (role: string) => {
    setLoading(true)
    setError('')

    try {
      const credentials = {
        admin: { email: 'admin@zoravo.com', password: 'admin123' },
        manager: { email: 'manager@zoravo.com', password: 'manager123' },
        coordinator: { email: 'coordinator@zoravo.com', password: 'coordinator123' }
      }

      const cred = credentials[role as keyof typeof credentials]
      
      // Store demo user in cookie
      const demoUser = {
        id: 'demo-' + role,
        email: cred.email,
        role: role,
        name: role.charAt(0).toUpperCase() + role.slice(1)
      }
      
      document.cookie = `demo-user=${JSON.stringify(demoUser)}; path=/; max-age=86400`
      
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Car,
      title: 'Vehicle Management',
      description: 'Complete vehicle tracking from intake to delivery with detailed history and status updates.'
    },
    {
      icon: Wrench,
      title: 'Service Tracking',
      description: 'Real-time work order management with installer assignments and progress monitoring.'
    },
    {
      icon: Users,
      title: 'Customer Relations',
      description: 'Comprehensive customer database with service history and communication tracking.'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Detailed insights into business performance with customizable reports and KPIs.'
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Secure multi-role system ensuring appropriate access levels for different team members.'
    },
    {
      icon: Clock,
      title: 'Real-Time Updates',
      description: 'Live status updates and notifications to keep everyone informed of progress.'
    }
  ]

  const stats = [
    { label: 'Vehicles Processed', value: '2,500+', icon: Car },
    { label: 'Happy Customers', value: '1,800+', icon: Users },
    { label: 'Services Completed', value: '5,200+', icon: CheckCircle },
    { label: 'Team Members', value: '50+', icon: Settings }
  ]

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        padding: '1rem 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size="medium" showText={true} variant="dark" />
          </div>
          
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '5rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'center'
        }}>
          {/* Left Content */}
          <div>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 1.5rem 0',
              lineHeight: '1.1'
            }}>
              Operations Management System for
              <br />
              <span style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #14b8a6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Car Accessories Businesses
              </span>
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.9)',
              margin: '0 0 2rem 0',
              lineHeight: '1.6'
            }}>
              Zoravo OMS digitizes your entire workflow—vehicle inward, installation tracking, invoicing, and service follow‑ups—so you can run operations with speed and clarity.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button
                onClick={() => router.push('/login')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: 'white',
                  color: '#2563eb',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                Get Started
                <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.color = '#2563eb'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'white'
                }}
              >
                Learn More
              </button>
            </div>

            {/* Demo Login Buttons */}
            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                Try the demo with different roles:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { role: 'admin', label: 'Admin', color: '#dc2626' },
                  { role: 'manager', label: 'Manager', color: '#2563eb' },
                  { role: 'coordinator', label: 'Coordinator', color: '#059669' }
                ].map(({ role, label, color }) => (
                  <button
                    key={role}
                    onClick={() => handleDemoLogin(role)}
                    disabled={loading}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.opacity = '0.9'
                      }
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.opacity = '1'
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(220,38,38,0.1)',
                border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: '0.5rem',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Right Content - Dashboard Preview */}
          <div style={{
            position: 'relative',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '2rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '0.25rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BarChart3 style={{ color: 'white', width: '1rem', height: '1rem' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                  Dashboard Overview
                </h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Vehicles in Workshop', value: '12', color: '#2563eb' },
                  { label: 'Jobs in Progress', value: '8', color: '#059669' },
                  { label: "Today's Intakes", value: '5', color: '#dc2626' },
                  { label: 'Monthly Revenue', value: '₹2.4L', color: '#7c3aed' }
                ].map((stat, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stat.color, marginBottom: '0.25rem' }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{
                height: '120px',
                backgroundColor: '#f3f4f6',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                📊 Revenue Chart Preview
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Purpose‑Built Modules</h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Everything your team needs—connected in one place.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[{label:'Recent Vehicles',desc:'Live workshop view for installers and coordinators.'},{label:'Recent Invoices',desc:'Accountant‑ready invoice previews and totals.'},{label:'Trackers',desc:'Call follow‑ups and service tracker for after‑sales.'},{label:'Settings',desc:'Locations, departments, users and company profile.'}].map((m,i)=> (
              <div key={i} style={{ border:'1px solid #e5e7eb', borderRadius:'0.75rem', padding:'1rem', background:'#f9fafb' }}>
                <div style={{ fontWeight:700, color:'#111827', marginBottom:'0.25rem' }}>{m.label}</div>
                <div style={{ color:'#6b7280', fontSize:'0.9rem' }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem'
        }}>
          {stats.map((stat, index) => (
            <div key={index} style={{
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: 'white',
              borderRadius: '1rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                margin: '0 auto 1rem auto',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <stat.icon style={{ color: 'white', width: '1.5rem', height: '1.5rem' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '6rem 2rem',
        backgroundColor: 'white'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0 0 1rem 0'
            }}>
              Everything You Need to Manage Your Business
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#6b7280',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Our comprehensive platform provides all the tools you need to efficiently manage 
              your car accessories business from start to finish.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem'
          }}>
            {features.map((feature, index) => (
              <div key={index} style={{
                padding: '2rem',
                backgroundColor: '#f9fafb',
                borderRadius: '1rem',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'
                e.currentTarget.style.borderColor = '#2563eb'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
              >
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <feature.icon style={{ color: 'white', width: '1.5rem', height: '1.5rem' }} />
                </div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 0.75rem 0'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  lineHeight: '1.6',
                  margin: '0'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '6rem 2rem',
        background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
        color: 'white'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            margin: '0 0 1.5rem 0'
          }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'rgba(255,255,255,0.8)',
            margin: '0 0 2rem 0',
            lineHeight: '1.6'
          }}>
            Join hundreds of car accessories businesses already using Zoravo OMS 
            to streamline their operations and grow their revenue.
          </p>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '1.1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Get Started Today
            <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        backgroundColor: '#111827',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.25rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Car style={{ color: 'white', width: '1rem', height: '1rem' }} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              Zoravo OMS
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>
            © 2024 Zoravo OMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
