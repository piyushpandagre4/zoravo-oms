'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Wrench, Calendar, FileText, AlertCircle, DollarSign, Plus, Search, Eye, Edit, Trash2, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { dbService, type DashboardKPIs, type Vehicle, type Invoice } from '@/lib/database-service'
import { checkUserRole, canViewRevenue, type UserRole } from '@/lib/rbac'
import DashboardCharts from '@/components/dashboard-charts'
import VehicleDetailsModal from '@/components/VehicleDetailsModal'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  // State for storing fetched names
  const [locationNames, setLocationNames] = useState<Map<string, string>>(new Map())
  const [vehicleTypeNames, setVehicleTypeNames] = useState<Map<string, string>>(new Map())
  const [managerNames, setManagerNames] = useState<Map<string, string>>(new Map())
  const [departmentNames, setDepartmentNames] = useState<Map<string, string>>(new Map())
  const router = useRouter()
  const supabase = createClient()
  const [adminMetrics, setAdminMetrics] = useState<{
    totalVehicles: number
    jobsInProgress: number
    todaysIntakes: number
    recentInvoices: number
    monthlyRevenue: number
    pendingAmount: number
    paidThisMonth: number
    overdueAmount: number
  } | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    loadDashboardData()
    loadUserRole()
    loadRelatedData()
    const onResize = () => setIsMobile(window.innerWidth <= 640)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadRelatedData = async () => {
    try {
      // Fetch all locations
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
      if (locations) {
        const locationsMap = new Map(locations.map(loc => [loc.id, loc.name]))
        setLocationNames(locationsMap)
      }

      // Fetch all vehicle types
      const { data: vehicleTypes } = await supabase
        .from('vehicle_types')
        .select('id, name')
      if (vehicleTypes) {
        const typesMap = new Map(vehicleTypes.map(vt => [vt.id, vt.name]))
        setVehicleTypeNames(typesMap)
      }

      // Fetch all managers
      const { data: managers } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'manager')
      if (managers) {
        const managersMap = new Map(managers.map(mgr => [mgr.id, mgr.name]))
        setManagerNames(managersMap)
      }

      // Fetch all departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name')
      if (departments) {
        const deptsMap = new Map(departments.map(dept => [dept.id, dept.name]))
        setDepartmentNames(deptsMap)
      }
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const loadUserRole = async () => {
    const profile = await checkUserRole()
    if (profile) {
      setUserRole(profile.role)
      // For installers, set default tab to Recent Vehicles and keep UI focused
      if (profile.role === 'installer' || profile.role === 'coordinator' || profile.role === 'manager') {
        setActiveTab('vehicles')
      }
      if (profile.role === 'accountant') {
        setActiveTab('invoices')
      }
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [kpisData, vehiclesData, invoicesData] = await Promise.all([
        dbService.getDashboardKPIs(),
        dbService.getRecentVehicles(5),
        dbService.getRecentInvoices(5)
      ])
      
      setKpis(kpisData)
      setRecentVehicles(vehiclesData)
      setRecentInvoices(invoicesData)
      // Compute admin overview metrics from actual tables for accuracy
      await computeAdminMetrics()
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Fallback to demo data if database is not available
      setKpis({
        vehiclesInWorkshop: 12,
        jobsInProgress: 8,
        todaysIntakes: 5,
        unpaidInvoices: 3,
        overduePayments: 2,
        monthlyRevenue: 240000,
        vehiclesInWorkshopChange: 2,
        jobsInProgressChange: 1,
        todaysIntakesChange: 3,
        unpaidInvoicesChange: -1,
        overduePaymentsChange: 0,
        monthlyRevenueChange: 15
      })
    } finally {
      setLoading(false)
    }
  }

  const computeAdminMetrics = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().substring(0, 7)

      const [totalVehiclesRes, jobsInProgressRes, todaysIntakesRes, recentInvoicesRes, monthlyRevenueRes, completedAllRes, installCompleteRes, installCompleteAltRes, pendingRes, paidThisMonthRes, overdueRes] = await Promise.all([
        supabase.from('vehicle_inward').select('id', { count: 'exact', head: true }),
        supabase.from('vehicle_inward').select('id', { count: 'exact', head: true }).in('status', ['in_progress', 'under_installation']),
        supabase.from('vehicle_inward').select('id', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('total_amount').eq('status', 'paid').gte('paid_date', `${thisMonth}-01`).lte('paid_date', `${thisMonth}-31`),
        // Fetch all completed-like entries; we'll filter to current month in JS to avoid column-name mismatches
        supabase.from('vehicle_inward').select('final_amount,total_amount,discount_amount,accessories_requested,updated_at,created_at,status').in('status', ['completed','complete_and_delivered']),
        supabase.from('vehicle_inward').select('id', { count: 'exact', head: true }).in('status', ['installation_complete']),
        supabase.from('vehicle_inward').select('id', { count: 'exact', head: true }).in('status', ['installation complete']),
        supabase.from('invoices').select('total_amount').eq('status','pending'),
        supabase.from('invoices').select('total_amount').eq('status','paid').gte('paid_date', `${thisMonth}-01`).lte('paid_date', `${thisMonth}-31`),
        supabase.from('invoices').select('total_amount').eq('status','overdue')
      ])

      let monthlyRevenue = (monthlyRevenueRes.data || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0)
      if (!monthlyRevenue && completedAllRes.data) {
        // Filter to current month by updated_at or created_at
        const completedThisMonth = (completedAllRes.data as any[]).filter(r => {
          const d = new Date(r.updated_at || r.created_at)
          const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
          return m === thisMonth
        })
        monthlyRevenue = completedThisMonth.reduce((s: number, r: any) => {
          if (r.final_amount) return s + r.final_amount
          if (r.total_amount) return s + r.total_amount
          // Compute from accessories JSON minus discount if available
          let sum = 0
          try {
            const arr = r.accessories_requested ? JSON.parse(r.accessories_requested) : []
            if (Array.isArray(arr)) sum = arr.reduce((acc: number, p: any) => acc + parseFloat(p?.price || 0), 0)
          } catch {}
          if (r.discount_amount) sum -= Number(r.discount_amount)
          return s + (sum || 0)
        }, 0)
      }

      const pendingAmount = (pendingRes.data || []).reduce((s:number,r:any)=>s+(r.total_amount||0),0)
      const paidThisMonth = (paidThisMonthRes.data || []).reduce((s:number,r:any)=>s+(r.total_amount||0),0)
      const overdueAmount = (overdueRes.data || []).reduce((s:number,r:any)=>s+(r.total_amount||0),0)
      setAdminMetrics({
        totalVehicles: totalVehiclesRes.count || 0,
        jobsInProgress: jobsInProgressRes.count || 0,
        todaysIntakes: todaysIntakesRes.count || 0,
        // Match the Recent Invoices tab: actual invoices + installation_complete previews (both variants)
        recentInvoices: (recentInvoicesRes.count || 0) + (installCompleteRes.count || 0) + (installCompleteAltRes.count || 0),
        monthlyRevenue,
        pendingAmount,
        paidThisMonth,
        overdueAmount
      })
    } catch (e) {
      // Fallback silently if tables are missing
      setAdminMetrics(null)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    }
    return `₹${amount.toLocaleString()}`
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change}${change !== 0 ? '%' : ''}`
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-500" />
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-500" />
    return null
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return { bg: '#dcfce7', color: '#166534' }
      case 'in_progress': 
      case 'in progress': return { bg: '#dbeafe', color: '#1e40af' }
      case 'under_installation':
      case 'under installation': return { bg: '#fef3c7', color: '#d97706' }
      case 'installation_complete':
      case 'installation complete': return { bg: '#dcfce7', color: '#166534' }
      case 'pending': return { bg: '#fef3c7', color: '#92400e' }
      case 'paid': return { bg: '#dcfce7', color: '#166534' }
      case 'overdue': return { bg: '#fee2e2', color: '#dc2626' }
      case 'in_workshop': return { bg: '#e0e7ff', color: '#3730a3' }
      default: return { bg: '#f1f5f9', color: '#64748b' }
    }
  }

  const getNextStatus = (currentStatus: string, userRole: UserRole | null): string | null => {
    const status = currentStatus?.toLowerCase().trim() || ''
    
    // Installer workflow: pending → in_progress → under_installation → installation_complete
    if (userRole === 'installer') {
      if (status === 'pending') return 'in_progress'
      if (status === 'in_progress' || status === 'in progress') return 'under_installation'
      if (status === 'under_installation' || status === 'under installation') return 'installation_complete'
    }
    
    return null
  }

  const handleQuickStatusUpdate = async (vehicle: Vehicle, newStatus: string) => {
    if (!confirm(`Update vehicle status to ${newStatus.replace('_', ' ')}?`)) {
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('vehicle_inward')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id)

      if (error) throw error

      alert('Status updated successfully!')
      loadDashboardData()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
  }

  const handleStatusUpdate = () => {
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: isMobile ? '1rem' : '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? '0.75rem' : '0' , flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem 0' }}>Dashboard</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Track your business performance</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
            <button 
              onClick={loadDashboardData}
              style={{
                display: 'flex', width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                padding: isMobile ? '0.5rem 1rem' : '0.625rem 1.25rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Refresh
            </button>
            {!isMobile && (userRole === 'admin' || userRole === 'manager' || userRole === 'coordinator') && (
            <button 
              onClick={() => router.push('/inward/new')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
                e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Plus style={{ width: '1rem', height: '1rem' }} />
              Add Vehicle
            </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: isMobile ? '0 1rem' : '0 2rem', display: 'flex', gap: '0' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {(userRole === 'installer' || userRole === 'coordinator'
            ? [
                { id: 'vehicles', label: 'Recent Vehicles' },
              ]
            : userRole === 'manager'
            ? [
                { id: 'vehicles', label: 'Recent Vehicles' },
                { id: 'invoices', label: 'Recent Invoices' },
              ]
            : userRole === 'accountant'
            ? [
                { id: 'invoices', label: 'Recent Invoices' },
              ]
            : [
            { id: 'overview', label: 'Overview' },
            { id: 'vehicles', label: 'Recent Vehicles' },
            { id: 'invoices', label: 'Recent Invoices' },
              ]
            ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.875rem 1rem 0.875rem 0',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === tab.id ? '600' : '500',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#374151'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6b7280'
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onStatusUpdate={handleStatusUpdate}
          canUpdateStatus={true}
          userRole={userRole || 'coordinator'}
        />
      )}

      {/* Content */}
      <div style={{ padding: isMobile ? '1rem' : '2rem' }}>
        {activeTab === 'overview' && userRole !== 'installer' && userRole !== 'coordinator' && (
          <div>
            {/* KPI Cards - Admin Spec */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {[1].map(()=>null) && [
                { 
                  title: 'Total Vehicles',
                  value: (adminMetrics?.totalVehicles ?? (kpis?.vehiclesInWorkshop || 0) + (kpis?.jobsInProgress || 0) + (kpis?.todaysIntakes || 0)).toString(),
                  icon: Car, 
                  change: '',
                  color: '#2563eb',
                  changeValue: 0
                },
                { 
                  title: "Jobs in Progress",
                  value: (adminMetrics?.jobsInProgress ?? kpis?.jobsInProgress ?? 0).toString(),
                  icon: Wrench, 
                  change: '',
                  color: '#059669',
                  changeValue: 0
                },
                { 
                  title: "Today's Intakes", 
                  value: (adminMetrics?.todaysIntakes ?? kpis?.todaysIntakes ?? 0).toString(),
                  icon: Calendar, 
                  change: '',
                  color: '#7c3aed',
                  changeValue: 0
                },
                { 
                  title: 'Recent Invoices',
                  value: (adminMetrics?.recentInvoices ?? recentInvoices.length).toString(),
                  icon: FileText, 
                  change: '',
                  color: '#2563eb',
                  changeValue: 0
                },
                { 
                  title: 'Monthly Revenue', 
                  value: formatCurrency(adminMetrics?.monthlyRevenue ?? kpis?.monthlyRevenue ?? 0),
                  icon: DollarSign, 
                  change: '',
                  color: '#059669',
                  changeValue: 0
                }
              ].map((kpi, index) => (
                <div key={index} style={{ 
                  backgroundColor: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '0.875rem', 
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => alert(`${kpi.title}: ${kpi.value}`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.15)'
                  e.currentTarget.style.borderColor = kpi.color
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
                >
                  {/* Subtle gradient background */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100%',
                    height: '4px',
                    background: `linear-gradient(90deg, transparent, ${kpi.color}20)`,
                    borderTopLeftRadius: '0.875rem',
                    borderTopRightRadius: '0.875rem'
                  }}></div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: `${kpi.color}15`,
                      borderRadius: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <kpi.icon style={{ color: kpi.color, width: '1.5rem', height: '1.5rem' }} strokeWidth={2} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: getChangeColor(kpi.changeValue) + '15', borderRadius: '0.5rem' }}>
                      {getChangeIcon(kpi.changeValue)}
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: getChangeColor(kpi.changeValue), 
                        fontWeight: '600' 
                      }}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', marginBottom: '0.375rem', lineHeight: '1.2' }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                    {kpi.title}
                  </div>
                </div>
              ))}
            </div>

            {/* Operational + Financial Snapshot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {/* Operations Snapshot */}
              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>Operations Snapshot</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {['pending','in_progress','under_installation','installation_complete','completed','delivered'].map((status) => {
                    const count = recentVehicles.filter(v => (v.status || '').toLowerCase().trim() === status).length
                    return (
                      <div key={status} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'capitalize' }}>{status.replace('_',' ')}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{count}</div>
          </div>
                    )
                  })}
                </div>
              </div>

              {/* Finance Snapshot */}
              <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>Finance Snapshot</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Recent Invoices</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{adminMetrics?.recentInvoices ?? recentInvoices.length}</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Pending Amount</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(adminMetrics?.pendingAmount ?? 0)}</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Paid This Month</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(adminMetrics?.paidThisMonth ?? 0)}</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Overdue</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(adminMetrics?.overdueAmount ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location-wise In Progress */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>In Progress by Location</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {Array.from(
                  recentVehicles.reduce((map: Map<string, number>, v: any) => {
                    const status = (v.status || '').toLowerCase().trim()
                    if (status === 'in_progress' || status === 'under_installation') {
                      const loc = v.location_id || (v.location || 'N/A')
                      map.set(loc, (map.get(loc) || 0) + 1)
                    }
                    return map
                  }, new Map<string, number>()).entries()
                ).map(([loc, count]) => (
                  <div key={loc} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{locationNames.get(loc) || loc}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{count}</div>
                  </div>
                ))}
                {recentVehicles.length === 0 && (
                  <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>No data available</div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.875rem', padding: '1.25rem', marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Recent Activity</div>
                <button onClick={loadDashboardData} style={{ border: '1px solid #e5e7eb', background: 'white', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}>Refresh</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {recentVehicles.slice(0,6).map(v => (
                  <div key={v.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>{v.customer?.name || v.registration_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{(v.status || '').replace('_',' ').toUpperCase()} • {new Date(v.updated_at || v.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                ))}
                {recentInvoices.slice(0,6).map(inv => (
                  <div key={inv.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>Invoice {inv.invoice_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatCurrency(inv.total_amount)} • {(inv.status || '').toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(380px, 1fr))', 
            gap: isMobile ? '1rem' : '1.5rem' 
          }}>
            {recentVehicles
              .filter(vehicle => {
                const status = vehicle.status?.toLowerCase().trim() || ''
                
                // Define final statuses that should be excluded from Recent Vehicles
                // Only "Delivered" is final - "Completed" can still appear
                const finalStatuses = ['delivered', 'complete_and_delivered']
                
                // Always exclude delivered from Recent Vehicles (final stage)
                if (finalStatuses.includes(status)) {
                  return false
                }
                
                // For installers: show pending, in_progress, under_installation; hide installation_complete
                if (userRole === 'installer') {
                  return status === 'pending' || 
                         status === 'in_progress' || 
                         status === 'in progress' ||
                         status === 'under_installation' ||
                         status === 'under installation'
                }
                
                // For admin/manager: filter out vehicles that have been "installation_complete" for more than 24 hours
                if (status === 'installation_complete' || status === 'installation complete') {
                  const updatedAt = vehicle.updated_at || vehicle.created_at
                  if (updatedAt) {
                    const updatedDate = new Date(updatedAt)
                    const twentyFourHoursAgo = new Date()
                    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
                    // Exclude if updated more than 24 hours ago
                    if (updatedDate < twentyFourHoursAgo) {
                      return false
                    }
                  }
                }
                
                // For admin/manager: show all other vehicles
                return true
              })
              .map((vehicle) => {
                const statusColors = getStatusColor(vehicle.status)
                return (
                  <div 
                    key={vehicle.id}
                style={{
                      backgroundColor: 'white',
                      borderRadius: '0.75rem',
                      border: '1px solid #e2e8f0',
                      overflow: 'hidden',
                      transition: 'all 0.3s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Header */}
                    <div style={{
                      padding: '1.25rem',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                          {vehicle.customer?.name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {vehicle.registration_number}
                        </div>
            </div>
                          <span style={{
                        padding: '0.375rem 0.875rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                        fontWeight: '600',
                            backgroundColor: statusColors.bg,
                            color: statusColors.color
                          }}>
                            {vehicle.status.replace('_', ' ').toUpperCase()}
                          </span>
                    </div>

                    {/* Details */}
                    <div style={{ padding: isMobile ? '1rem' : '1.25rem' }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
                        gap: isMobile ? '0.75rem' : '1rem',
                        marginBottom: '1.25rem'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Inward Date & Time</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {new Date(vehicle.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                            {' '}{new Date(vehicle.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Owner Name</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {vehicle.customer?.name || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Model</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {vehicle.make} {vehicle.model}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Car Number</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {vehicle.registration_number}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Location</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {((vehicle as any).location_id && locationNames.get((vehicle as any).location_id)) || (vehicle as any).location_id || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Vehicle Type</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {(vehicle.vehicle_type && vehicleTypeNames.get(vehicle.vehicle_type)) || vehicle.vehicle_type || 'N/A'}
                          </div>
                        </div>
                        {(vehicle as any).assigned_manager_id && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Manager</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {managerNames.get((vehicle as any).assigned_manager_id) || (vehicle as any).assigned_manager_id || 'N/A'}
                            </div>
                          </div>
                        )}
                        {(vehicle as any).estimated_completion_date && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Expected Date</div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                              {new Date((vehicle as any).estimated_completion_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ 
                        marginBottom: '1.25rem',
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.5rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Product Details</div>
                        <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                          {(() => {
                            const accessories = (vehicle as any).accessories_requested
                            if (!accessories) return (vehicle as any).issues_reported || 'No details provided'
                            
                            try {
                              const products = JSON.parse(accessories)
                              if (Array.isArray(products) && products.length > 0) {
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {products.map((product: any, idx: number) => (
                                      <div key={idx} style={{ fontSize: '0.8125rem' }}>
                                        <strong>{product.product || 'Product'}</strong>
                                        {product.brand && ` - ${product.brand}`}
                                        {product.department && (
                                          <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                            ({departmentNames.get(product.department) || product.department})
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              return accessories
                            } catch {
                              return accessories
                            }
                          })()}
                        </div>
                      </div>

                      {/* Status Update Dropdown - Disabled for completed and final statuses */}
                      {(() => {
                        const vehicleStatus = vehicle.status?.toLowerCase().trim() || ''
                        // Only "Delivered" is final - but "Completed" should be non-functional in Recent Vehicles
                        const isFinalStatus = ['delivered', 'complete_and_delivered'].includes(vehicleStatus)
                        const isCompleted = vehicleStatus === 'completed'
                        const isInstallationComplete = vehicleStatus === 'installation_complete' || vehicleStatus === 'installation complete'
                        
                        if (isFinalStatus || isCompleted || isInstallationComplete) {
                          // Read-only display for completed/delivered/installation_complete status
                          return (
                            <div style={{
                              padding: '1rem',
                              backgroundColor: '#f3f4f6',
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb',
                              marginBottom: '0.5rem',
                              textAlign: 'center'
                            }}>
                              <div style={{ 
                                fontSize: '0.875rem', 
                                fontWeight: '600', 
                                color: '#6b7280',
                                marginBottom: '0.25rem'
                              }}>
                                Status {isFinalStatus ? '(Final - No Updates)' : isInstallationComplete ? '(Moved to Accounts - No Updates)' : '(No Updates in Recent Vehicles)'}
                              </div>
                              <div style={{
                                fontSize: '0.875rem',
                                color: '#374151',
                                fontStyle: 'italic'
                              }}>
                                {vehicle.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </div>
                            </div>
                          )
                        }
                        
                        // Editable dropdown for other statuses
                        return (
                          <div style={{
                            padding: '1rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '0.5rem',
                            border: '1px solid #e5e7eb',
                            marginBottom: '0.5rem'
                          }}>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: '600', 
                              color: '#111827',
                              marginBottom: '0.5rem'
                            }}>
                              Update Status
                            </div>
                            <select
                              value={vehicle.status || 'pending'}
                              onChange={(e) => {
                                e.stopPropagation()
                                const newStatus = e.target.value
                                if (newStatus !== vehicle.status) {
                                  handleQuickStatusUpdate(vehicle, newStatus)
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '0.875rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                backgroundColor: 'white',
                                color: '#111827',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6'
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="under_installation">Under Installation</option>
                              <option value="installation_complete">Installation Complete</option>
                            </select>
                          </div>
                        )
                      })()}

                      {/* View Details Button - Hidden for completed/delivered/installation_complete statuses */}
                      {(() => {
                        const vehicleStatus = vehicle.status?.toLowerCase().trim() || ''
                        const isNonFunctional = ['completed', 'delivered', 'complete_and_delivered', 'installation_complete', 'installation complete'].includes(vehicleStatus)
                        
                        if (isNonFunctional) {
                          return null // Don't show button for completed/delivered/installation_complete
                        }
                        
                        return (
                          <button 
                            onClick={() => handleVehicleClick(vehicle)}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1.5rem',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              marginTop: userRole === 'installer' ? '0.5rem' : '0'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#1d4ed8'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#2563eb'
                            }}
                          >
                            View Full Details
                          </button>
                        )
                      })()}
                    </div>
                          </div>
                )
              })}

            {recentVehicles.filter(vehicle => {
                const status = vehicle.status?.toLowerCase().trim() || ''
                
                // Define final statuses that should be excluded from Recent Vehicles
                // Only "Delivered" is final - "Completed" can still appear
                const finalStatuses = ['delivered', 'complete_and_delivered']
                
                // Always exclude delivered from Recent Vehicles (final stage)
                if (finalStatuses.includes(status)) {
                  return false
                }
                
                // For installers: show pending, in_progress, under_installation
                if (userRole === 'installer') {
                  return status === 'pending' || 
                         status === 'in_progress' || 
                         status === 'in progress' ||
                         status === 'under_installation' ||
                         status === 'under installation'
                }
                
                // For admin/manager: filter out vehicles that have been "installation_complete" for more than 24 hours
                if (status === 'installation_complete' || status === 'installation complete') {
                  const updatedAt = vehicle.updated_at || vehicle.created_at
                  if (updatedAt) {
                    const updatedDate = new Date(updatedAt)
                    const twentyFourHoursAgo = new Date()
                    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
                    // Exclude if updated more than 24 hours ago
                    if (updatedDate < twentyFourHoursAgo) {
                      return false
                    }
                  }
                }
                
                // For admin/manager: show all other vehicles
                return true
              }).length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                padding: '3rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                  No vehicles found
                </div>
                <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                  {userRole === 'installer' 
                    ? 'You have no vehicles assigned at the moment.'
                    : 'No recent vehicles found.'
                  }
                </div>
            </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Recent Invoices</h3>
              {/* Read-only view for accountants; no actions */}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {recentInvoices.map((invoice) => {
                    const statusColors = getStatusColor(invoice.status)
                const inward = (invoice as any).previewFromInward
                const previewProducts = (invoice as any).previewProducts as Array<any> | undefined
                    return (
                  <div key={invoice.id} style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: '1.25rem',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                          {invoice.vehicle?.customer?.name || inward?.customer_name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {invoice.invoice_number}
                        </div>
                      </div>
                          <span style={{
                        padding: '0.375rem 0.875rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                        fontWeight: '600',
                            backgroundColor: statusColors.bg,
                            color: statusColors.color
                          }}>
                        {invoice.status.replace('_', ' ').toUpperCase()}
                          </span>
                          </div>

                    {/* Details */}
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '1rem',
                        marginBottom: '1.25rem'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Customer</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {invoice.vehicle?.customer?.name || inward?.customer_name || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Vehicle Number</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {invoice.vehicle?.registration_number || inward?.registration_number || 'N/A'}
                          </div>
                        </div>
                        {inward && (
                          <>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Model</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                {(inward.make || '') + (inward.model ? ` ${inward.model}` : '') || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Location</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                {inward.location_id ? (locationNames.get(inward.location_id) || inward.location_id) : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Vehicle Type</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                {inward.vehicle_type ? (vehicleTypeNames.get(inward.vehicle_type) || inward.vehicle_type) : 'N/A'}
                              </div>
                            </div>
                            {inward.assigned_manager_id && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Manager</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                  {managerNames.get(inward.assigned_manager_id) || inward.assigned_manager_id}
                                </div>
                              </div>
                            )}
                            {inward.estimated_completion_date && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Expected Date</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                  {new Date(inward.estimated_completion_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Amount</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#111827' }}>
                            {formatCurrency(invoice.total_amount)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Date</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            {formatDate(invoice.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Product Details */}
                      {previewProducts && previewProducts.length > 0 && (
                        <div style={{ 
                          marginTop: '0.5rem',
                          padding: '1rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.5rem'
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>Product Details</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {previewProducts.map((p, idx) => (
                              <div key={idx} style={{ fontSize: '0.8125rem', color: '#111827' }}>
                                <strong>{p.product || 'Product'}</strong>
                                {p.brand && ` - ${p.brand}`}
                                {p.department && (
                                  <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                                    ({departmentNames.get(p.department) || p.department})
                                  </span>
                                )}
                                <span style={{ float: 'right', fontWeight: 600 }}>
                                  {formatCurrency(p.price || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {recentInvoices.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  padding: '3rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                    No invoices to show
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                    Invoices from the external system and invoice-ready entries will appear here.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}