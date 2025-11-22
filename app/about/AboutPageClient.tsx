'use client'

import Logo from '@/components/Logo'
import { CheckCircle, TrendingUp, Shield, Zap, Users, BarChart3, Clock, HeadphonesIcon } from 'lucide-react'

export default function AboutPageClient() {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* HERO SECTION - Marketing Focused */}
      <div
        style={{
          borderRadius: '1.5rem',
          padding: '3rem 2.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          border: 'none',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Logo size="large" showText={true} variant="light" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.375rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(10px)' }}>Version 1.0</span>
            <span style={{ padding: '0.375rem 0.75rem', backgroundColor: 'rgba(16,185,129,0.3)', color: 'white', border: '1px solid rgba(16,185,129,0.5)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(10px)' }}>Made in India 🇮🇳</span>
            <span style={{ padding: '0.375rem 0.75rem', backgroundColor: 'rgba(37,99,235,0.3)', color: 'white', border: '1px solid rgba(37,99,235,0.5)', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backdropFilter: 'blur(10px)' }}>Cloud Powered</span>
          </div>
        </div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', margin: '0 0 1rem 0', lineHeight: '1.1' }}>
            Transform Your Automotive Business
            <br />
            <span style={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>With Smart Operations</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '1.25rem', marginTop: '1rem', maxWidth: '800px', lineHeight: '1.6', fontWeight: 400 }}>
            Zoravo OMS is the all-in-one Operations Management System that automates your workflow, 
            boosts productivity, and drives revenue growth. Join hundreds of automotive businesses 
            already using Zoravo to streamline operations and delight customers.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <a href="mailto:info@zoravo.in" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '0.875rem 2rem', 
                backgroundColor: '#fbbf24', 
                color: '#1f2937', 
                border: 'none', 
                borderRadius: '0.75rem', 
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(251, 191, 36, 0.4)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(251, 191, 36, 0.4)'
              }}
              >
                🚀 Start Free Trial
              </button>
            </a>
            <a href="mailto:info@zoravo.in" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '0.875rem 2rem', 
                backgroundColor: 'transparent', 
                color: 'white', 
                border: '2px solid rgba(255,255,255,0.3)', 
                borderRadius: '0.75rem', 
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
              >
                📞 Schedule Demo
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* VALUE PROPOSITION STATS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <StatCard 
          icon={<TrendingUp style={{ width: '2rem', height: '2rem' }} />}
          number="50%"
          label="Faster Operations"
          color="#2563eb"
        />
        <StatCard 
          icon={<BarChart3 style={{ width: '2rem', height: '2rem' }} />}
          number="30%"
          label="Revenue Increase"
          color="#059669"
        />
        <StatCard 
          icon={<Clock style={{ width: '2rem', height: '2rem' }} />}
          number="80%"
          label="Time Saved"
          color="#f59e0b"
        />
        <StatCard 
          icon={<Users style={{ width: '2rem', height: '2rem' }} />}
          number="100+"
          label="Happy Customers"
          color="#8b5cf6"
        />
      </div>

      {/* KEY BENEFITS - Marketing Focused */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e2e8f0', 
        borderRadius: '1rem', 
        padding: '2.5rem', 
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', margin: '0 0 0.75rem 0' }}>
            Why Businesses Choose Zoravo OMS
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: '700px', margin: '0 auto' }}>
            Join the growing community of automotive businesses that have transformed their operations with Zoravo
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <BenefitCard 
            icon={<Zap style={{ width: '1.5rem', height: '1.5rem' }} />}
            title="Lightning Fast Performance"
            desc="Built for speed with optimized queries and real-time updates. Experience instant page loads and seamless navigation that keeps your team productive."
            color="#f59e0b"
          />
          <BenefitCard 
            icon={<Shield style={{ width: '1.5rem', height: '1.5rem' }} />}
            title="Enterprise-Grade Security"
            desc="Bank-level security with Row Level Security (RLS), encrypted data storage, and role-based access control. Your data is always protected."
            color="#2563eb"
          />
          <BenefitCard 
            icon={<BarChart3 style={{ width: '1.5rem', height: '1.5rem' }} />}
            title="Data-Driven Decisions"
            desc="Make smarter decisions with comprehensive analytics, real-time KPIs, and exportable reports. Turn data into actionable insights."
            color="#059669"
          />
          <BenefitCard 
            icon={<Users style={{ width: '1.5rem', height: '1.5rem' }} />}
            title="Team Collaboration"
            desc="Seamless communication with comments, attachments, and notifications. Keep your entire team aligned and informed."
            color="#8b5cf6"
          />
          <BenefitCard 
            icon={<CheckCircle style={{ width: '1.5rem', height: '1.5rem' }} />}
            title="Purpose-Built for Automotive"
            desc="Designed specifically for automotive accessory businesses. No unnecessary features—just what you need to run efficiently."
            color="#ec4899"
          />
          <BenefitCard 
            icon={<HeadphonesIcon style={{ width: '1.5rem', height: '1.5rem' }} />}
            title="24/7 Support"
            desc="Dedicated support team ready to help. Get assistance when you need it with responsive customer service."
            color="#14b8a6"
          />
        </div>
      </div>

      {/* FEATURES GRID */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#111827', margin: '0 0 0.75rem 0' }}>
            Everything You Need in One Platform
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.125rem', maxWidth: '700px', margin: '0 auto' }}>
            Powerful features designed to streamline every aspect of your automotive service business
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <FeatureCard title="📈 Real-Time Dashboard" emoji="📈" desc="Monitor your business performance with live KPIs, revenue tracking, job status, and interactive charts—all in one place." />
          <FeatureCard title="🚗 Vehicle Management" emoji="🚗" desc="Complete vehicle intake system with customer details, service history, and automated workflow tracking from intake to delivery." />
          <FeatureCard title="💰 Financial Management" emoji="💰" desc="Comprehensive invoicing, payment tracking, P&L reports, and financial analytics. Export data for accounting integration." />
          <FeatureCard title="📞 Customer CRM" emoji="📞" desc="Track customer communications, follow-ups, warranties, and complaints. Never lose track of customer interactions." />
          <FeatureCard title="🔔 Smart Notifications" emoji="🔔" desc="Real-time alerts for status updates, assignments, and important events. Keep your team informed automatically." />
          <FeatureCard title="📱 WhatsApp Integration" emoji="📱" desc="Automated WhatsApp notifications for deliveries and updates. Engage customers on their preferred platform." />
          <FeatureCard title="🖨️ Professional Printing" emoji="🖨️" desc="Generate professional job sheets and reports with complete vehicle and customer details for your installers." />
          <FeatureCard title="👥 Role-Based Access" emoji="👥" desc="Granular permissions for Admin, Manager, Coordinator, Installer, and Accountant roles. Control who sees what." />
          <FeatureCard title="📊 Advanced Reporting" emoji="📊" desc="Export financial data, generate P&L reports, and analyze performance with comprehensive reporting tools." />
          <FeatureCard title="💬 Team Collaboration" emoji="💬" desc="Add comments, attach files, and track progress on jobs. Full audit trail for complete transparency." />
          <FeatureCard title="📱 Mobile Responsive" emoji="📱" desc="Access your operations from anywhere. Works seamlessly on desktop, tablet, and mobile devices." />
          <FeatureCard title="☁️ Cloud Hosted" emoji="☁️" desc="No installation required. Access your data securely from anywhere with automatic backups and updates." />
        </div>
      </div>

      {/* SOCIAL PROOF / TESTIMONIALS */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e2e8f0', 
        borderRadius: '1rem', 
        padding: '2.5rem', 
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
            Trusted by Automotive Businesses
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Join the growing community of successful businesses using Zoravo OMS
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <TestimonialCard 
            quote="Zoravo OMS transformed our operations. We've reduced paperwork by 90% and our team productivity has increased significantly."
            author="RS Car Accessories"
            role="Nagpur"
          />
          <TestimonialCard 
            quote="The real-time dashboard and financial reporting features have given us complete visibility into our business performance."
            author="Automotive Business Owner"
            role="Verified User"
          />
          <TestimonialCard 
            quote="Customer satisfaction has improved dramatically since we started using Zoravo. The WhatsApp integration is a game-changer."
            author="Service Center Manager"
            role="Happy Customer"
          />
        </div>
      </div>

      {/* PRICING CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
        borderRadius: '1.5rem',
        padding: '3rem 2rem',
        textAlign: 'center',
        color: 'white',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 1rem 0' }}>
            Ready to Transform Your Business?
          </h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem', opacity: 0.95, maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
            Start your 24-hour free trial today. No credit card required. Experience the power of Zoravo OMS risk-free.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:info@zoravo.in" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '1rem 2.5rem', 
                backgroundColor: '#fbbf24', 
                color: '#1f2937', 
                border: 'none', 
                borderRadius: '0.75rem', 
                cursor: 'pointer',
                fontSize: '1.125rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(251, 191, 36, 0.4)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(251, 191, 36, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(251, 191, 36, 0.4)'
              }}
              >
                🎯 Start Free Trial Now
              </button>
            </a>
            <a href="mailto:info@zoravo.in" style={{ textDecoration: 'none' }}>
              <button style={{ 
                padding: '1rem 2.5rem', 
                backgroundColor: 'transparent', 
                color: 'white', 
                border: '2px solid rgba(255,255,255,0.3)', 
                borderRadius: '0.75rem', 
                cursor: 'pointer',
                fontSize: '1.125rem',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
              }}
              >
                💬 Contact Sales
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* COMPANY INFO */}
      <div style={{ 
        backgroundColor: 'white', 
        border: '1px solid #e2e8f0', 
        borderRadius: '1rem', 
        padding: '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: 0, marginBottom: '1.5rem' }}>
          About Zoravo OMS
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '0.5rem 1.5rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          marginBottom: '1.5rem'
        }}>
          <DetailRow label="Application" value="Zoravo OMS" />
          <DetailRow label="Industry" value="Automotive Service & Accessories Management" />
          <DetailRow label="Developed By" value="Raghav Sukhadia" />
          <DetailRow label="Support" value={<a href="mailto:info@zoravo.in" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>info@zoravo.in</a>} />
          <DetailRow label="Location" value="Sunkool Solutions, Nagpur, India" />
          <DetailRow label="Connect" value={
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a 
                href="https://www.instagram.com/sunkool_india?igsh=a3BheDM5OGJmN2p6" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#2563eb', 
                  fontWeight: 600, 
                  textDecoration: 'none',
                  transition: 'all 0.2s'
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
                Instagram
              </a>
              <a 
                href="https://www.facebook.com/sunkoolindia/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#2563eb', 
                  fontWeight: 600, 
                  textDecoration: 'none',
                  transition: 'all 0.2s'
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
                Facebook
              </a>
              <a 
                href="https://www.youtube.com/@sunkool" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#2563eb', 
                  fontWeight: 600, 
                  textDecoration: 'none',
                  transition: 'all 0.2s'
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
                YouTube
              </a>
            </div>
          } />
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <Label>Our Mission</Label>
          <Value>
            Zoravo OMS was built to revolutionize how automotive service businesses operate. 
            We combine cutting-edge technology with deep industry knowledge to deliver a solution 
            that's powerful, intuitive, and designed to scale with your business. From small shops 
            to large operations, Zoravo helps you work smarter, serve customers better, and grow faster.
          </Value>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Tag>Modern UI/UX</Tag>
          <Tag>Real-time Analytics</Tag>
          <Tag>Role-based Security</Tag>
          <Tag>Financial Reporting</Tag>
          <Tag>Customer-Centric</Tag>
          <Tag>Scalable Cloud</Tag>
          <Tag>WhatsApp Integration</Tag>
          <Tag>Print Ready</Tag>
          <Tag>Data Export</Tag>
          <Tag>Mobile First</Tag>
          <Tag>Enterprise Security</Tag>
          <Tag>24/7 Support</Tag>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, emoji, desc }: { title: string; emoji: string; desc: string }) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      border: '1px solid #e2e8f0', 
      borderRadius: '0.75rem', 
      padding: '1.5rem',
      transition: 'all 0.3s',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
      e.currentTarget.style.borderColor = '#2563eb'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
      e.currentTarget.style.borderColor = '#e2e8f0'
    }}
    >
      <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '0.75rem' }}>{emoji}</div>
      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>{desc}</div>
    </div>
  )
}

function BenefitCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div style={{ 
      padding: '1.5rem', 
      backgroundColor: '#f9fafb', 
      borderRadius: '0.75rem', 
      border: `2px solid ${color}20`,
      transition: 'all 0.3s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = `0 8px 16px ${color}30`
      e.currentTarget.style.borderColor = color
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
      e.currentTarget.style.borderColor = `${color}20`
    }}
    >
      <div style={{ color: color, marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>{desc}</div>
    </div>
  )
}

function StatCard({ icon, number, label, color }: { icon: React.ReactNode; number: string; label: string; color: string }) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      border: '1px solid #e2e8f0', 
      borderRadius: '0.75rem', 
      padding: '1.5rem',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ color: color, display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>{icon}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', marginBottom: '0.25rem' }}>{number}</div>
      <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div style={{ 
      padding: '1.5rem', 
      backgroundColor: '#f9fafb', 
      borderRadius: '0.75rem', 
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ fontSize: '1.5rem', color: '#2563eb', marginBottom: '0.75rem' }}>"</div>
      <div style={{ color: '#374151', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem', fontStyle: 'italic' }}>
        {quote}
      </div>
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
        <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>{author}</div>
        <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{role}</div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>{children}</div>
}

function Value({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '1rem', color: '#111827', lineHeight: '1.6' }}>{children}</div>
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: '0.375rem 0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '9999px',
        backgroundColor: '#f9fafb',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <div style={{ color: '#64748b', fontSize: '0.875rem', padding: '0.5rem 0', fontWeight: 600 }}>{label}</div>
      <div style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 500, padding: '0.5rem 0' }}>{value}</div>
    </>
  )
}

