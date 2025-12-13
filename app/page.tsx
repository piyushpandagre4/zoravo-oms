'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  FileText,
  X,
  AlertCircle,
  Briefcase,
  User,
  HelpCircle,
  Mail,
  Play,
  Linkedin,
  Instagram,
  Youtube,
  Zap,
  Target,
  Building2,
  Facebook,
  MapPin,
  Code
} from 'lucide-react'
import Logo from '@/components/Logo'

function LandingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [animatedStats, setAnimatedStats] = useState({
    vehicles: 0,
    customers: 0,
    services: 0,
    team: 0
  })

  // Check for createAccount query parameter
  useEffect(() => {
    const createAccount = searchParams.get('createAccount')
    if (createAccount === 'true') {
      setShowCreateAccount(true)
      // Remove query parameter from URL
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  // Sticky header on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animated counters for stats
  useEffect(() => {
    const targets = { vehicles: 2500, customers: 1800, services: 5200, team: 50 }
    const duration = 2000
    const steps = 60
    const increment = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      
      setAnimatedStats({
        vehicles: Math.floor(targets.vehicles * progress),
        customers: Math.floor(targets.customers * progress),
        services: Math.floor(targets.services * progress),
        team: Math.floor(targets.team * progress)
      })

      if (currentStep >= steps) {
        clearInterval(timer)
        setAnimatedStats(targets)
      }
    }, increment)

    return () => clearInterval(timer)
  }, [])


  // Features organized in 3 tiers
  const coreModules = [
    {
      icon: Car,
      title: 'Track Every Vehicle. Every Time.',
      description: 'Complete vehicle lifecycle management from intake to delivery with real-time status tracking and detailed history.',
      tier: 'core'
    },
    {
      icon: Wrench,
      title: 'Service Tracking Made Simple',
      description: 'Real-time work order management with installer assignments, progress monitoring, and automated notifications.',
      tier: 'core'
    },
    {
      icon: FileText,
      title: 'Automated Invoicing & Payments',
      description: 'Streamlined invoicing system with payment tracking, automated reminders, and financial reporting.',
      tier: 'core'
    }
  ]

  const growthTools = [
    {
      icon: BarChart3,
      title: 'Analytics That Drive Decisions',
      description: 'Powerful insights into business performance with customizable reports, KPIs, and revenue analytics.',
      tier: 'growth'
    },
    {
      icon: Users,
      title: 'Customer Relationship Management',
      description: 'Comprehensive customer database with service history, communication tracking, and follow-up automation.',
      tier: 'growth'
    },
    {
      icon: Zap,
      title: 'Workflow Automation',
      description: 'Automate repetitive tasks, send daily reports, and streamline operations with smart notifications.',
      tier: 'growth'
    }
  ]

  const teamTools = [
    {
      icon: Shield,
      title: 'Role-Based Access Control',
      description: 'Secure multi-role system with granular permissions for admins, managers, coordinators, and installers.',
      tier: 'team'
    },
    {
      icon: Building2,
      title: 'Multi-Tenant Franchise Support',
      description: 'Manage multiple locations and franchises with complete data isolation and centralized oversight.',
      tier: 'team'
    },
    {
      icon: Clock,
      title: 'Real-Time Collaboration',
      description: 'Live status updates, instant notifications, and seamless team communication across all devices.',
      tier: 'team'
    }
  ]

  const stats = [
    { 
      label: 'Vehicles Processed', 
      value: animatedStats.vehicles, 
      icon: Car,
      context: 'across 40+ workshops nationwide'
    },
    { 
      label: 'Happy Customers', 
      value: animatedStats.customers, 
      icon: Users,
      context: 'trusting us with their business'
    },
    { 
      label: 'Services Completed', 
      value: animatedStats.services, 
      icon: CheckCircle,
      context: 'with 98% customer satisfaction'
    },
    { 
      label: 'Team Members', 
      value: animatedStats.team, 
      icon: Settings,
      context: 'serving businesses of every scale'
    }
  ]

  const testimonials = [
    {
      name: 'Rajesh Kumar',
      business: 'Auto Accessories Hub, Mumbai',
      quote: 'Zoravo OMS transformed our operations. We can now track every vehicle from intake to delivery seamlessly.',
      rating: 5
    },
    {
      name: 'Priya Sharma',
      business: 'Car Care Solutions, Delhi',
      quote: 'The automated invoicing and payment tracking has saved us hours every week. Highly recommended!',
      rating: 5
    },
    {
      name: 'Amit Patel',
      business: 'Premium Auto Works, Bangalore',
      quote: 'Best investment we made. The dashboard gives us complete visibility into our business performance.',
      rating: 5
    }
  ]

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      {/* Sticky Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : '#ffffff',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        borderBottom: '1px solid #e5e7eb',
        padding: isScrolled ? '0.75rem 0' : '1rem 0',
        boxShadow: isScrolled ? '0 4px 6px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size="medium" showText={true} variant="dark" />
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#2563eb',
                border: '1.5px solid #2563eb',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#eff6ff'
                e.currentTarget.style.borderColor = '#1d4ed8'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = '#2563eb'
              }}
            >
              Login
            </button>
            <button
              onClick={() => setShowCreateAccount(true)}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.3)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(37, 99, 235, 0.2)'
              }}
            >
              Register
            </button>
            <a
              href="mailto:info@zoravo.in"
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9'
                e.currentTarget.style.borderColor = '#cbd5e1'
                e.currentTarget.style.color = '#475569'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.backgroundColor = '#f8fafc'
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              <HelpCircle style={{ width: '1rem', height: '1rem' }} />
              Contact Us
            </a>
            <button
              onClick={() => router.push('/about')}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '120px',
                justifyContent: 'center'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9'
                e.currentTarget.style.borderColor = '#cbd5e1'
                e.currentTarget.style.color = '#475569'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = '#e2e8f0'
                e.currentTarget.style.color = '#64748b'
              }}
            >
              About
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        paddingTop: '5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Enhanced Background with Gradient and Animated Elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(15, 23, 42, 0.02) 50%, rgba(37, 99, 235, 0.03) 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradientShift 15s ease infinite',
          zIndex: 0
        }}></div>
        {/* Floating Icons Background */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '100px',
          height: '100px',
          opacity: 0.1,
          zIndex: 0,
          animation: 'float 20s ease-in-out infinite'
        }}>
          <Car style={{ width: '100%', height: '100%', color: '#2563eb' }} />
        </div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '5%',
          width: '80px',
          height: '80px',
          opacity: 0.1,
          zIndex: 0,
          animation: 'float 25s ease-in-out infinite',
          animationDelay: '2s'
        }}>
          <BarChart3 style={{ width: '100%', height: '100%', color: '#4f46e5' }} />
        </div>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Left Content */}
          <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            {/* Social Proof with Partner Logos */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#eff6ff',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#2563eb',
                fontWeight: '600',
                border: '1px solid #dbeafe'
              }}>
                <Star style={{ width: '1rem', height: '1rem', fill: '#fbbf24', color: '#fbbf24' }} />
                Trusted by 200+ Businesses
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <span>Partners:</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {['AutoHub', 'CarCare', 'PremiumAuto', 'FastTrack'].map((name, i) => (
                    <div key={i} style={{
                      padding: '0.25rem 0.75rem',
                      background: '#f3f4f6',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: '#4b5563',
                      border: '1px solid #e5e7eb'
                    }}>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <h1 style={{
              fontSize: '3.75rem',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 1.5rem 0',
              lineHeight: '1.1',
              letterSpacing: '-0.03em'
            }}>
              Zoravo OMS — The Complete
              <br />
              <span style={{ 
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Car Accessories Business Suite
              </span>
            </h1>
            <p style={{
              fontSize: '1.375rem',
              color: '#475569',
              margin: '0 0 1rem 0',
              lineHeight: '1.7',
              fontWeight: '500'
            }}>
              Streamline Your Car Accessories Business — From Job Intake to Delivery, Seamlessly.
            </p>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b',
              margin: '0 0 2rem 0',
              lineHeight: '1.7',
              fontWeight: '400'
            }}>
              Manage jobs, track vehicles, and get paid faster with one powerful system. Run your operations with <strong style={{ color: '#1e293b' }}>speed, clarity, and complete control</strong>.
            </p>
            
            {/* Key Benefits */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              {[
                { icon: '✓', text: 'Complete vehicle lifecycle management' },
                { icon: '✓', text: 'Real-time installation tracking' },
                { icon: '✓', text: 'Automated invoicing & payments' },
                { icon: '✓', text: 'Multi-tenant support for franchises' }
              ].map((benefit, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: '#475569',
                  fontSize: '1rem'
                }}>
                  <span style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 'bold'
                  }}>{benefit.icon}</span>
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowCreateAccount(true)}
                style={{
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: '700',
                  fontSize: '1.125rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 99, 235, 0.5)'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)'
                }}
              >
                🚀 Start Free Trial
                <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              
              <button
                onClick={() => {
                  // Scroll to dashboard preview or show demo
                  const dashboardSection = document.getElementById('dashboard-preview')
                  if (dashboardSection) {
                    dashboardSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: 'white',
                  color: '#2563eb',
                  border: '1.5px solid #2563eb',
                  borderRadius: '0.75rem',
                  fontWeight: '600',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff'
                  e.currentTarget.style.borderColor = '#1d4ed8'
                  e.currentTarget.style.color = '#1d4ed8'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#2563eb'
                  e.currentTarget.style.color = '#2563eb'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Play style={{ width: '1.25rem', height: '1.25rem', fill: '#2563eb' }} />
                Watch Demo
              </button>
            </div>

          </div>

          {/* Right Content - Dashboard Preview */}
          <div 
            id="dashboard-preview"
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '1.25rem',
              padding: '2.5rem',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
              animation: 'fadeInUp 1s ease-out 0.3s both',
              transition: 'all 0.3s ease',
              maxWidth: '100%'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)'
              e.currentTarget.style.boxShadow = '0 25px 60px rgba(0,0,0,0.18)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{
              backgroundColor: 'transparent',
              borderRadius: '0.5rem',
              padding: '0'
            }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.875rem', 
                marginBottom: '2rem',
                paddingBottom: '1.25rem',
                borderBottom: '2px solid #f1f5f9'
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}>
                  <BarChart3 style={{ color: 'white', width: '1.25rem', height: '1.25rem' }} />
                </div>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '1.375rem', 
                    fontWeight: '700', 
                    color: '#0f172a',
                    letterSpacing: '-0.01em'
                  }}>
                    Dashboard Overview
                  </h3>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.8125rem',
                    color: '#64748b',
                    fontWeight: '500'
                  }}>
                    Real-time business insights
                  </p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1.25rem', 
                marginBottom: '2rem' 
              }}>
                {[
                  { label: 'Vehicles in Workshop', value: '12', color: '#2563eb', bgColor: '#eff6ff', icon: Car },
                  { label: 'Jobs in Progress', value: '8', color: '#059669', bgColor: '#f0fdf4', icon: CheckCircle },
                  { label: "Today's Intakes", value: '5', color: '#dc2626', bgColor: '#fef2f2', icon: TrendingUp },
                  { label: 'Monthly Revenue', value: '₹2.4L', color: '#7c3aed', bgColor: '#faf5ff', icon: BarChart3 }
                ].map((stat, index) => {
                  const IconComponent = stat.icon
                  return (
                    <div 
                      key={index} 
                      style={{
                        padding: '1.25rem',
                        backgroundColor: stat.bgColor,
                        borderRadius: '0.75rem',
                        border: `1.5px solid ${stat.color}20`,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = `0 8px 20px ${stat.color}25`
                        e.currentTarget.style.borderColor = `${stat.color}40`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.borderColor = `${stat.color}20`
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '0.5rem',
                          backgroundColor: stat.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.15
                        }}>
                          <IconComponent style={{ color: stat.color, width: '1rem', height: '1rem' }} />
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '2rem', 
                        fontWeight: '800', 
                        color: stat.color, 
                        marginBottom: '0.375rem',
                        lineHeight: '1.2'
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ 
                        fontSize: '0.8125rem', 
                        color: '#475569',
                        fontWeight: '600',
                        lineHeight: '1.4'
                      }}>
                        {stat.label}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Enhanced Revenue Chart */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '0.875rem',
                padding: '1.5rem',
                border: '1.5px solid #e2e8f0',
                position: 'relative',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '0.25rem'
                    }}>
                      Revenue Trend
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748b'
                    }}>
                      Last 7 days
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#2563eb'
                  }}>
                    ₹2.4L
                  </div>
                </div>
                
                {/* Chart Bars Container */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-end', 
                  height: '140px',
                  gap: '0.625rem',
                  marginBottom: '1.25rem',
                  paddingBottom: '0.5rem'
                }}>
                  {[65, 80, 55, 90, 75, 85, 70].map((height, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${height}%`,
                        background: `linear-gradient(180deg, ${i === 3 ? '#2563eb' : '#3b82f6'} 0%, ${i === 3 ? '#4f46e5' : '#6366f1'} 100%)`,
                        borderRadius: '0.375rem 0.375rem 0 0',
                        minWidth: '24px',
                        maxWidth: '40px',
                        animation: `fadeInUp 0.6s ease-out ${i * 0.1}s both`,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: i === 3 ? '0 4px 12px rgba(37, 99, 235, 0.4)' : '0 2px 6px rgba(37, 99, 235, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.85'
                        e.currentTarget.style.transform = 'scaleY(1.05) translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.5)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.transform = 'scaleY(1) translateY(0)'
                        e.currentTarget.style.boxShadow = i === 3 ? '0 4px 12px rgba(37, 99, 235, 0.4)' : '0 2px 6px rgba(37, 99, 235, 0.2)'
                      }}
                      title={`Day ${i + 1}: ₹${(height * 1000).toLocaleString()}`}
                    />
                  ))}
                </div>
                
                {/* Footer - View Analytics Link */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e5e7eb',
                  fontSize: '0.8125rem',
                  color: '#2563eb',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1d4ed8'
                  e.currentTarget.style.gap = '0.625rem'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#2563eb'
                  e.currentTarget.style.gap = '0.5rem'
                }}
                >
                  <span>View detailed analytics</span>
                  <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Reorganized into 3 Tiers */}
      <section id="features" style={{
        padding: '4rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 0.75rem 0',
              letterSpacing: '-0.02em'
            }}>
              Everything You Need to Manage Your Business
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Our comprehensive platform provides all the tools you need to efficiently manage 
              your car accessories business from start to finish.
            </p>
          </div>

          {/* Core Modules */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '1.5rem',
              paddingBottom: '0.75rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <Target style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
              <h3 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Core Modules
              </h3>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem'
            }}>
              {coreModules.map((feature, index) => (
                <div key={index} style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(37, 99, 235, 0.15)'
                  e.currentTarget.style.borderColor = '#2563eb'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                >
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                  }}>
                    <feature.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.3'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: '#6b7280',
                    lineHeight: '1.7',
                    margin: '0'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Tools */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <TrendingUp style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Growth Tools
              </h3>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem'
            }}>
              {growthTools.map((feature, index) => (
                <div key={index} style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(5, 150, 105, 0.15)'
                  e.currentTarget.style.borderColor = '#059669'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                >
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}>
                    <feature.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.3'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: '#6b7280',
                    lineHeight: '1.7',
                    margin: '0'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Tools */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <Users style={{ width: '1.5rem', height: '1.5rem', color: '#7c3aed' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Team Tools
              </h3>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem'
            }}>
              {teamTools.map((feature, index) => (
                <div key={index} style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '1rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(124, 58, 237, 0.15)'
                  e.currentTarget.style.borderColor = '#7c3aed'
                  e.currentTarget.style.backgroundColor = '#ffffff'
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                >
                  <div style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                  }}>
                    <feature.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1.375rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.3'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '0.9375rem',
                    color: '#6b7280',
                    lineHeight: '1.7',
                    margin: '0'
                  }}>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Animated Counters */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#f8fafc'
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
              padding: '2.5rem 2rem',
              backgroundColor: 'white',
              borderRadius: '1.25rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              transition: 'all 0.3s ease',
              animation: `fadeInUp 0.8s ease-out ${index * 0.1}s both`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
            }}
            >
              <div style={{
                width: '3.5rem',
                height: '3.5rem',
                margin: '0 auto 1.25rem auto',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}>
                <stat.icon style={{ color: 'white', width: '1.75rem', height: '1.75rem' }} />
              </div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: '800', 
                color: '#1f2937', 
                marginBottom: '0.5rem',
                lineHeight: '1.2'
              }}>
                {stat.value.toLocaleString()}+
              </div>
              <div style={{ 
                fontSize: '1rem', 
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.375rem'
              }}>
                {stat.label}
              </div>
              <div style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                {stat.context}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: '#0f172a',
              margin: '0 0 1rem 0',
              letterSpacing: '-0.02em'
            }}>
              Loved by Businesses Nationwide
            </h2>
            <p style={{
              fontSize: '1.125rem',
              color: '#64748b',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              See what our customers have to say about their experience with Zoravo OMS
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem'
          }}>
            {testimonials.map((testimonial, index) => (
              <div key={index} style={{
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '1rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
              }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} style={{ width: '1.25rem', height: '1.25rem', fill: '#fbbf24', color: '#fbbf24' }} />
                  ))}
                </div>
                <p style={{
                  fontSize: '1rem',
                  color: '#374151',
                  lineHeight: '1.7',
                  margin: '0 0 1.5rem 0',
                  fontStyle: 'italic'
                }}>
                  "{testimonial.quote}"
                </p>
                <div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {testimonial.name}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {testimonial.business}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Zoravo OMS Section */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: '800',
            color: '#0f172a',
            margin: '0 0 2rem 0',
            letterSpacing: '-0.02em',
            textAlign: 'center'
          }}>
            About Zoravo OMS
          </h2>

          {/* Information Card */}
          <div style={{
            backgroundColor: '#f9fafb',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            marginBottom: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr',
              gap: '2rem',
              rowGap: '1.5rem'
            }}>
              <div style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Application
              </div>
              <div style={{
                fontSize: '0.9375rem',
                color: '#1f2937',
                fontWeight: '500'
              }}>
                Zoravo OMS
              </div>

              <div style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Industry
              </div>
              <div style={{
                fontSize: '0.9375rem',
                color: '#1f2937',
                fontWeight: '500'
              }}>
                Automotive Service & Accessories Management
              </div>

              <div style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Code style={{ width: '1rem', height: '1rem' }} />
                Developed By
              </div>
              <div style={{
                fontSize: '0.9375rem',
                color: '#1f2937',
                fontWeight: '500'
              }}>
                Raghav Sukhadia
              </div>

              <div style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Mail style={{ width: '1rem', height: '1rem' }} />
                Support
              </div>
              <div>
                <a
                  href="mailto:info@zoravo.in"
                  style={{
                    fontSize: '0.9375rem',
                    color: '#2563eb',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1d4ed8'
                    e.currentTarget.style.textDecoration = 'underline'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#2563eb'
                    e.currentTarget.style.textDecoration = 'none'
                  }}
                >
                  info@zoravo.in
                </a>
              </div>

              <div style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <MapPin style={{ width: '1rem', height: '1rem' }} />
                Location
              </div>
              <div style={{
                fontSize: '0.9375rem',
                color: '#1f2937',
                fontWeight: '500'
              }}>
                Sunkool Solutions, Nagpur, India
              </div>

              <div style={{
                fontSize: '0.9375rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Connect
              </div>
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <a
                  href="https://www.instagram.com/sunkool_india?igsh=a3BheDM5OGJmN2p6"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.9375rem',
                    color: '#2563eb',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#E4405F'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#2563eb'
                  }}
                >
                  <Instagram style={{ width: '1rem', height: '1rem' }} />
                  Instagram
                </a>
                <a
                  href="https://www.facebook.com/sunkoolindia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.9375rem',
                    color: '#2563eb',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1877F2'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#2563eb'
                  }}
                >
                  <Facebook style={{ width: '1rem', height: '1rem' }} />
                  Facebook
                </a>
                <a
                  href="https://www.youtube.com/@sunkool"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.9375rem',
                    color: '#2563eb',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FF0000'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#2563eb'
                  }}
                >
                  <Youtube style={{ width: '1rem', height: '1rem' }} />
                  YouTube
                </a>
              </div>
            </div>
          </div>

          {/* Our Mission Section */}
          <div>
            <h3 style={{
              fontSize: '1.875rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 1.5rem 0'
            }}>
              Our Mission
            </h3>
            <p style={{
              fontSize: '1.125rem',
              color: '#475569',
              lineHeight: '1.8',
              margin: 0,
              maxWidth: '900px'
            }}>
              Zoravo OMS was built to revolutionize how automotive service businesses operate. We combine cutting-edge technology with deep industry knowledge to deliver a solution that's powerful, intuitive, and designed to scale with your business. From small shops to large operations, Zoravo helps you work smarter, serve customers better, and grow faster.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: '#0f172a',
        color: 'white'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: 'bold',
            margin: '0 0 1rem 0'
          }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.9)',
            margin: '0 0 1.5rem 0',
            lineHeight: '1.6'
          }}>
            Join hundreds of car accessories businesses already using Zoravo OMS 
            to streamline their operations and grow their revenue.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateAccount(true)}
              style={{
                padding: '1.125rem 2.5rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontWeight: '700',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4)'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(37, 99, 235, 0.5)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(37, 99, 235, 0.4)'
              }}
            >
              Start Your Business
              <ArrowRight style={{ width: '1.5rem', height: '1.5rem' }} />
            </button>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '1.125rem 2.5rem',
                backgroundColor: 'transparent',
                color: 'white',
                border: '2px solid white',
                borderRadius: '0.75rem',
                fontWeight: '600',
                fontSize: '1.125rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer style={{
        padding: '4rem 2rem 2rem',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '3rem',
            marginBottom: '3rem',
            paddingBottom: '3rem'
          }}>
            {/* Brand Column */}
            <div>
              <Logo size="medium" showText={true} variant="light" />
              <p style={{
                margin: '1rem 0 0 0',
                fontSize: '0.9375rem',
                color: '#9ca3af',
                lineHeight: '1.7',
                maxWidth: '300px'
              }}>
                Zoravo OMS – Empowering Car Accessories Businesses Since 2024.
              </p>
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1.5rem'
              }}>
                <a
                  href="https://linkedin.com/company/zoravo"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2563eb'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Linkedin style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
                <a
                  href="https://www.instagram.com/sunkool_india?igsh=a3BheDM5OGJmN2p6"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E4405F'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Instagram style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
                <a
                  href="https://www.facebook.com/sunkoolindia/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1877F2'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Facebook style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
                <a
                  href="https://www.youtube.com/@sunkool"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FF0000'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#374151'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <Youtube style={{ width: '1.25rem', height: '1.25rem' }} />
                </a>
              </div>
            </div>

            {/* Company Links */}
            <div>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1rem 0'
              }}>
                Company
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <a
                  href="/about"
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  About
                </a>
                <a
                  href="/pricing"
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  Pricing
                </a>
                <a
                  href="mailto:info@zoravo.in?subject=Support Request&body=Hello,%0D%0A%0D%0AI need assistance with Zoravo OMS.%0D%0A%0D%0AThank you."
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  Support
                </a>
                <a
                  href="mailto:info@zoravo.in?subject=Contact Request&body=Hello,%0D%0A%0D%0AI would like to get in touch regarding Zoravo OMS.%0D%0A%0D%0AThank you."
                  style={{
                    fontSize: '0.875rem',
                    color: '#9ca3af',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9ca3af'
                  }}
                >
                  Contact
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1rem 0'
              }}>
                Product
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {['Features', 'Modules', 'Integrations', 'API', 'Roadmap'].map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      fontSize: '0.875rem',
                      color: '#9ca3af',
                      textDecoration: 'none',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af'
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>

            {/* Resources Links */}
            <div>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 1rem 0'
              }}>
                Resources
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {['Blog', 'Case Studies', 'Help Center', 'Community', 'Status'].map((link) => (
                  <a
                    key={link}
                    href="#"
                    style={{
                      fontSize: '0.875rem',
                      color: '#9ca3af',
                      textDecoration: 'none',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#9ca3af'
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '2rem'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              © 2024 Zoravo OMS. All rights reserved.
            </p>
            <div style={{
              display: 'flex',
              gap: '2rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Create Account Modal */}
      {showCreateAccount && <CreateAccountModal onClose={() => setShowCreateAccount(false)} />}
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  )
}

// Create Account Modal Component
function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    organizationName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone,
          adminPassword: formData.adminPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        router.push(`/login?tenant=${data.tenant_code}`)
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-in'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .modal-container {
            grid-template-columns: 1fr !important;
          }
          .marketing-side {
            display: none !important;
          }
        }
      `}</style>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '95vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        animation: 'slideUp 0.3s ease-out'
      }}
      className="modal-container"
      onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side - Marketing Content */}
        <div className="marketing-side" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
          <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '-1rem',
                right: '-1rem',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '2.5rem',
                height: '2.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.1', marginBottom: '1rem' }}>
                Start Your Business Journey
              </div>
              <div style={{ fontSize: '1.125rem', opacity: 0.95, lineHeight: '1.6' }}>
                Join hundreds of car accessories businesses already using Zoravo OMS to streamline operations and grow revenue.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {[
                { icon: '🚀', title: 'Get Started in Minutes', desc: 'Quick setup, no technical knowledge required' },
                { icon: '📊', title: 'Complete Business Management', desc: 'All tools in one place' },
                { icon: '💰', title: 'Affordable Pricing', desc: '₹12,000/year - Best value in the market' },
                { icon: '🛡️', title: '24-Hour Free Trial', desc: 'Try before you commit' }
              ].map((feature, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '2rem', flexShrink: 0 }}>{feature.icon}</div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{feature.title}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, padding: '1.5rem', background: 'rgba(255,255,255,0.15)', borderRadius: '1rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.95, marginBottom: '0.5rem' }}>✨ Trusted by 200+ Businesses</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>₹12,000<span style={{ fontSize: '1rem', fontWeight: '400' }}>/year</span></div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>Just ₹1,000/month • No hidden fees</div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{
          padding: '2.5rem',
          overflowY: 'auto',
          maxHeight: '95vh'
        }}>
          <div style={{
            marginBottom: '2rem'
          }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 0.5rem 0'
            }}>
              Create Your Account
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: 0
            }}>
              Fill in your details to get started
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{
                width: '5rem',
                height: '5rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle style={{ width: '3rem', height: '3rem', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1f2937' }}>
                Account Created Successfully! 🎉
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '1rem' }}>
                Your account is under review. You'll receive your tenant number shortly.
              </p>
              <div style={{
                padding: '1rem',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '0.75rem',
                marginTop: '1.5rem'
              }}>
                <p style={{ color: '#059669', fontWeight: '600', fontSize: '0.875rem', margin: 0 }}>
                  ⏰ Your account will be active for 24 hours. Please submit payment proof to continue.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  <AlertCircle style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Company Information Section */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: '0.75rem',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Briefcase style={{ width: '1.25rem', height: '1.25rem', color: '#0369a1' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#0369a1', margin: 0 }}>
                    Company Information
                  </h3>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    placeholder="e.g., ABC Car Accessories"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      border: '2px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb'
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Admin Account Section */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '0.75rem',
                border: '1px solid #fcd34d'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <User style={{ width: '1.25rem', height: '1.25rem', color: '#92400e' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#92400e', margin: 0 }}>
                    Admin Account Details
                  </h3>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="John Doe"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="admin@yourcompany.com"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.adminPhone}
                      onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                      placeholder="+91 9876543210"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="At least 8 characters"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter your password"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb'
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db'
                        e.target.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Info Cards */}
              <div style={{
                display: 'grid',
                gap: '0.75rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>Special Launch Price</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>₹12,000<span style={{ fontSize: '1rem', fontWeight: '400' }}>/year</span></div>
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Just ₹1,000/month</div>
                </div>
                
                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fcd34d',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <Clock style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} />
                  <div>
                    <strong>24-Hour Free Trial:</strong> Your account will be active for 24 hours. Submit payment proof in settings to activate permanently.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: loading 
                    ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' 
                    : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: loading ? 'none' : '0 10px 25px rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(37, 99, 235, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(37, 99, 235, 0.3)'
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    Get Started Now
                    <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
                  </>
                )}
              </button>

              <p style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                textAlign: 'center',
                margin: 0
              }}>
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
