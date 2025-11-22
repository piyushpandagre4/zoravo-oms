'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Logo from '@/components/Logo'
import { CheckCircle, Zap, Users, BarChart3, Shield, HeadphonesIcon, ArrowRight, Clock } from 'lucide-react'

interface SubscriptionPlan {
  plan_name: string
  plan_display_name: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'annual' | 'quarterly'
  trial_days: number
  is_active: boolean
  features?: string[]
}

export default function PricingPageClient() {
  const router = useRouter()
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionPlan()
  }, [])

  const fetchSubscriptionPlan = async () => {
    try {
      const response = await fetch('/api/public/subscription-plans')
      const data = await response.json()
      
      if (data.plans && data.plans.length > 0) {
        // Get the annual plan or the first active plan
        const annualPlan = data.plans.find((p: SubscriptionPlan) => 
          p.billing_cycle === 'annual' && p.is_active
        ) || data.plans.find((p: SubscriptionPlan) => p.is_active) || data.plans[0]
        
        setPlan(annualPlan)
      } else {
        // Default fallback plan
        setPlan({
          plan_name: 'annual',
          plan_display_name: 'Annual Plan',
          amount: 12000,
          currency: 'INR',
          billing_cycle: 'annual',
          trial_days: 24,
          is_active: true,
          features: []
        })
      }
    } catch (error) {
      console.error('Error fetching subscription plan:', error)
      // Default fallback plan
      setPlan({
        plan_name: 'annual',
        plan_display_name: 'Annual Plan',
        amount: 12000,
        currency: 'INR',
        billing_cycle: 'annual',
        trial_days: 24,
        is_active: true,
        features: []
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 3rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 0'
      }}>
        <Logo size="medium" showText={true} variant="dark" />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#2563eb',
              border: '1.5px solid #2563eb',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff'
              e.currentTarget.style.borderColor = '#1d4ed8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#2563eb'
            }}
          >
            Home
          </button>
          <button
            onClick={() => router.push('/login')}
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
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(37, 99, 235, 0.2)'
            }}
          >
            Login
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '4rem'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 900,
            color: '#111827',
            margin: '0 0 1rem 0',
            lineHeight: '1.1'
          }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#6b7280',
            margin: '0 0 2rem 0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            One plan. All features. No hidden costs.
          </p>
        </div>

        {/* Pricing Card */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 4rem',
          backgroundColor: 'white',
          borderRadius: '1.5rem',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          {/* Popular Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>
            ⭐ RECOMMENDED PLAN
          </div>

          {/* Pricing Content */}
          <div style={{ padding: '3rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#6b7280' }}>Loading pricing information...</p>
              </div>
            ) : plan ? (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <span style={{
                    fontSize: '3.5rem',
                    fontWeight: 900,
                    color: '#111827'
                  }}>
                    {plan.currency === 'INR' ? '₹' : plan.currency === 'USD' ? '$' : ''}
                    {plan.amount.toLocaleString('en-IN')}
                  </span>
                  <span style={{
                    fontSize: '1.25rem',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    /{plan.billing_cycle === 'annual' ? 'year' : plan.billing_cycle === 'monthly' ? 'month' : 'quarter'}
                  </span>
                </div>

                <div style={{
                  textAlign: 'center',
                  marginBottom: '2rem'
                }}>
                  <p style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    margin: '0 0 0.5rem 0'
                  }}>
                    {plan.plan_display_name || `${plan.billing_cycle.charAt(0).toUpperCase() + plan.billing_cycle.slice(1)} Subscription Plan`}
                  </p>
                  {plan.trial_days > 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#eff6ff',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      color: '#1e40af',
                      fontWeight: '600',
                      marginTop: '0.5rem'
                    }}>
                      <Clock style={{ width: '1rem', height: '1rem' }} />
                      {plan.trial_days} {plan.trial_days === 1 ? 'Day' : 'Days'} Free Trial
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: '#dc2626' }}>Unable to load pricing information. Please try again later.</p>
              </div>
            )}

            {/* Features List */}
            <div style={{
              marginBottom: '2.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                Everything You Need
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                {[
                  { icon: <Users style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Unlimited Users' },
                  { icon: <Zap style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'All Features Included' },
                  { icon: <BarChart3 style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Advanced Analytics' },
                  { icon: <Shield style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Priority Support' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Order Management' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Customer Management' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Real-time Tracking' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'WhatsApp Integration' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Invoice & Payments' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Multi-tenant Support' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Daily Reports' },
                  { icon: <CheckCircle style={{ width: '1.25rem', height: '1.25rem' }} />, text: 'Role-based Access' }
                ].map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.5rem'
                    }}
                  >
                    <div style={{ color: '#2563eb', flexShrink: 0 }}>
                      {feature.icon}
                    </div>
                    <span style={{
                      fontSize: '0.9375rem',
                      color: '#374151',
                      fontWeight: '500'
                    }}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => router.push('/')}
              style={{
                width: '100%',
                padding: '1rem 2rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(37, 99, 235, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)'
              }}
            >
              Get Started Now
              <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>
        </div>

        {/* Additional Information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '4rem'
        }}>
          {/* Payment Info */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Shield style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
              Payment Process
            </h3>
            <ol style={{
              paddingLeft: '1.5rem',
              margin: 0,
              color: '#6b7280',
              lineHeight: '1.8'
            }}>
              <li>Start your {plan?.trial_days || 24}-day free trial</li>
              <li>Submit payment proof in Settings</li>
              <li>Get activated within 24 hours</li>
              <li>Enjoy full access to all features</li>
            </ol>
          </div>

          {/* Support Info */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <HeadphonesIcon style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
              Support & Help
            </h3>
            <p style={{
              color: '#6b7280',
              lineHeight: '1.8',
              margin: '0 0 1rem 0'
            }}>
              Need assistance? Our support team is here to help you.
            </p>
            <a
              href="mailto:info@zoravo.in?subject=Pricing Inquiry&body=Hello,%0D%0A%0D%0AI have a question about Zoravo OMS pricing.%0D%0A%0D%0AThank you."
              style={{
                color: '#2563eb',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9375rem'
              }}
            >
              Contact Support →
            </a>
          </div>

          {/* Trial Info */}
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
              Free Trial
            </h3>
            <p style={{
              color: '#6b7280',
              lineHeight: '1.8',
              margin: 0
            }}>
              Start with a {plan?.trial_days || 24}-day free trial. No credit card required. Explore all features risk-free before committing.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '1.5rem',
          border: '1px solid #e5e7eb',
          marginBottom: '4rem'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Frequently Asked Questions
          </h2>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {[
              {
                q: 'What is included in the annual plan?',
                a: 'The annual plan includes all features: unlimited users, complete order management, customer management, real-time tracking, WhatsApp integration, invoice & payment tracking, advanced analytics, daily reports, and priority support.'
              },
              {
                q: 'Can I cancel my subscription?',
                a: 'Yes, you can cancel your subscription at any time. However, you will continue to have access until the end of your billing period.'
              },
              {
                q: 'Is there a setup fee?',
                a: 'No, there are no setup fees or hidden costs. The ₹12,000 annual fee is all-inclusive.'
              },
              {
                q: 'What happens after the free trial?',
                a: `After your ${plan?.trial_days || 24}-day free trial, you can continue using Zoravo OMS by submitting payment proof. Your account will be activated within 24 hours of payment verification.`
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a satisfaction guarantee. If you are not happy with the service within the first 30 days, contact our support team for assistance.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb'
                }}
              >
                <h4 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '0.75rem'
                }}>
                  {faq.q}
                </h4>
                <p style={{
                  color: '#6b7280',
                  lineHeight: '1.8',
                  margin: 0
                }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: 'white',
          borderRadius: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '800',
            color: '#111827',
            marginBottom: '1rem'
          }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            marginBottom: '2rem'
          }}>
            Join hundreds of businesses already using Zoravo OMS
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1.125rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(37, 99, 235, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)'
            }}
          >
            Start Your Free Trial
            <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

