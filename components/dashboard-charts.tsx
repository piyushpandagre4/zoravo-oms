'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface ChartData {
  name: string
  value: number
  color?: string
}

interface DashboardChartsProps {
  kpis: {
    vehiclesInWorkshop: number
    jobsInProgress: number
    todaysIntakes: number
    unpaidInvoices: number
    overduePayments: number
    monthlyRevenue: number
  }
}

export default function DashboardCharts({ kpis }: DashboardChartsProps) {
  // Prepare data for different chart types
  const statusData = [
    { name: 'In Workshop', value: kpis.vehiclesInWorkshop, color: '#2563eb' },
    { name: 'Jobs Progress', value: kpis.jobsInProgress, color: '#059669' },
    { name: 'Today Intakes', value: kpis.todaysIntakes, color: '#7c3aed' },
    { name: 'Unpaid', value: kpis.unpaidInvoices, color: '#dc2626' },
    { name: 'Overdue', value: kpis.overduePayments, color: '#ea580c' },
  ]

  const revenueData = [
    { name: 'Jan', revenue: kpis.monthlyRevenue * 0.8 },
    { name: 'Feb', revenue: kpis.monthlyRevenue * 0.9 },
    { name: 'Mar', revenue: kpis.monthlyRevenue * 1.1 },
    { name: 'Apr', revenue: kpis.monthlyRevenue * 0.95 },
    { name: 'May', revenue: kpis.monthlyRevenue * 1.2 },
    { name: 'Jun', revenue: kpis.monthlyRevenue },
  ]

  const COLORS = ['#2563eb', '#059669', '#7c3aed', '#dc2626', '#ea580c']

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
      {/* Status Overview Bar Chart */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>Status Overview</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={statusData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Trend Line Chart */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>Revenue Trend</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#059669" 
              strokeWidth={3}
              dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution Pie Chart */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>Work Distribution</h4>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>Quick Stats</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Vehicles</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
              {kpis.vehiclesInWorkshop + kpis.jobsInProgress + kpis.todaysIntakes}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Active Jobs</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>{kpis.jobsInProgress}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Pending Payments</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#dc2626' }}>{kpis.unpaidInvoices}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Monthly Revenue</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>
              ₹{(kpis.monthlyRevenue / 100000).toFixed(1)}L
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

