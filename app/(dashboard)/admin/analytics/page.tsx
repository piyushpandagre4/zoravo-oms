'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Activity
} from 'lucide-react'

// Disable static generation - must be exported before component
export const dynamic = 'force-dynamic'

export default function AnalyticsPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    growthRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      // Get tenant stats
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, is_active, subscription_status, is_free')

      if (tenantsError) {
        console.error('Error loading tenants:', tenantsError)
        return
      }

      // Get user count
      const { data: tenantUsers, error: usersError } = await supabase
        .from('tenant_users')
        .select('user_id')

      if (usersError) {
        console.error('Error loading users:', usersError)
        return
      }

      // Get revenue stats
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('amount, status, created_at')
        .eq('status', 'paid')

      if (subsError) {
        console.error('Error loading subscriptions:', subsError)
        return
      }

      const totalRevenue = subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const monthlyRevenue = subscriptions?.filter(s => 
        new Date(s.created_at) >= thisMonth
      ).reduce((sum, s) => sum + s.amount, 0) || 0

      const uniqueUsers = new Set(tenantUsers?.map(tu => tu.user_id) || [])

      setStats({
        totalTenants: tenants?.length || 0,
        activeTenants: tenants?.filter(t => t.is_active).length || 0,
        totalUsers: uniqueUsers.size,
        totalRevenue,
        monthlyRevenue,
        growthRate: 0 // Calculate based on previous month
      })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 0.5rem 0'
        }}>
          Platform Analytics
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Overview of platform performance and metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard
          icon={Building2}
          label="Total Tenants"
          value={stats.totalTenants}
          color="#2563eb"
        />
        <StatCard
          icon={Activity}
          label="Active Tenants"
          value={stats.activeTenants}
          color="#059669"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          color="#7c3aed"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="#dc2626"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toFixed(2)}`}
          color="#f59e0b"
        />
      </div>

      {/* Charts Placeholder */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <BarChart3 style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', color: '#9ca3af' }} />
        <p>Revenue charts and detailed analytics coming soon</p>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '0.5rem',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon style={{ width: '1.25rem', height: '1.25rem', color }} />
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
        {label}
      </div>
    </div>
  )
}

