'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CheckCircle, Clock, AlertCircle, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface VehicleInward {
  id: string
  registration_number: string
  customer_name: string
  vehicle_make: string
  vehicle_model: string
  status: string
  priority: string
  assigned_installer_id: string
  estimated_completion_date: string
  issues_reported: string
  accessories_requested: string
  created_at: string
  updated_at: string
}

// Disable static generation - must be exported before component
export const dynamic = 'force-dynamic'

export default function InstallerDashboard() {
  const [recentVehicles, setRecentVehicles] = useState<VehicleInward[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()
  const supabase = createClient()
  
  const vehiclesPerPage = 6

  useEffect(() => {
    loadInstallerWork()
  }, [])

  // Keyboard navigation for full-screen view
  useEffect(() => {
    if (!isFullScreen) return

    const handleKeyPress = (e: KeyboardEvent) => {
      const totalPagesCalc = Math.ceil(recentVehicles.length / vehiclesPerPage)
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentPage < totalPagesCalc) {
        setCurrentPage(prev => prev + 1)
      } else if (e.key === 'Escape') {
        setIsFullScreen(false)
        setCurrentPage(1)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFullScreen, currentPage, recentVehicles.length, vehiclesPerPage])

  // Reset to page 1 if current page is invalid after data changes
  useEffect(() => {
    if (isFullScreen && recentVehicles.length > 0) {
      const totalPagesCalc = Math.ceil(recentVehicles.length / vehiclesPerPage)
      if (currentPage > totalPagesCalc && totalPagesCalc > 0) {
        setCurrentPage(1)
      }
    }
  }, [recentVehicles.length, isFullScreen, currentPage, vehiclesPerPage])

  const loadInstallerWork = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', user.id)
        .single()

      if (!profile) return

      // Fetch vehicles assigned to this installer
      // Increased limit to support full-screen pagination view
      const { data: inwardData, error } = await supabase
        .from('vehicle_inward')
        .select(`
          *,
          vehicles:vehicle_id (
            id,
            registration_number,
            make,
            model,
            customers:customer_id (
              name
            )
          )
        `)
        .in('status', ['in_progress', 'pending', 'under_installation', 'under installation'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Transform data
      const transformedData = (inwardData || []).map((inward: any) => ({
        id: inward.id,
        registration_number: inward.vehicles?.registration_number || 'N/A',
        customer_name: inward.vehicles?.customers?.name || 'N/A',
        vehicle_make: inward.vehicles?.make || '',
        vehicle_model: inward.vehicles?.model || '',
        status: inward.status,
        priority: inward.priority,
        assigned_installer_id: inward.assigned_installer_id,
        estimated_completion_date: inward.estimated_completion_date,
        issues_reported: inward.issues_reported,
        accessories_requested: inward.accessories_requested,
        created_at: inward.created_at,
        updated_at: inward.updated_at
      }))

      setRecentVehicles(transformedData)
    } catch (error) {
      console.error('Error loading installer work:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (inwardId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('vehicle_inward')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inwardId)

      if (error) throw error
      
      alert('Status updated successfully!')
      loadInstallerWork()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return { bg: '#dcfce7', color: '#166534' }
      case 'in_progress': return { bg: '#dbeafe', color: '#1e40af' }
      case 'pending': return { bg: '#fef3c7', color: '#92400e' }
      default: return { bg: '#f1f5f9', color: '#64748b' }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return { bg: '#fee2e2', color: '#dc2626' }
      case 'medium': return { bg: '#fef3c7', color: '#d97706' }
      case 'low': return { bg: '#dbeafe', color: '#2563eb' }
      default: return { bg: '#f1f5f9', color: '#64748b' }
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Pagination logic for full-screen view
  const totalPages = Math.ceil(recentVehicles.length / vehiclesPerPage)
  const startIndex = (currentPage - 1) * vehiclesPerPage
  const endIndex = startIndex + vehiclesPerPage
  const currentVehicles = recentVehicles.slice(startIndex, endIndex)

  const handleFullScreenToggle = () => {
    setIsFullScreen(!isFullScreen)
    setCurrentPage(1) // Reset to first page when entering full screen
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Full Screen View Component
  const FullScreenView = () => {
    if (!isFullScreen) return null

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0f172a',
        zIndex: 9999,
        padding: '2rem',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1.5rem',
          borderBottom: '2px solid #334155'
        }}>
          <div>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: '#ffffff',
              margin: 0,
              marginBottom: '0.5rem'
            }}>
              Recent Vehicles - Full Screen View
            </h1>
            <p style={{
              fontSize: '1.25rem',
              color: '#94a3b8',
              margin: 0
            }}>
              Page {currentPage} of {totalPages} • Showing {currentVehicles.length} of {recentVehicles.length} vehicles
            </p>
          </div>
          <button
            onClick={handleFullScreenToggle}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              border: '2px solid #334155',
              borderRadius: '0.75rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#334155'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b'
            }}
          >
            <Minimize2 style={{ width: '1.5rem', height: '1.5rem' }} />
            Exit Full Screen
          </button>
        </div>

        {/* Vehicles Grid - 2 columns, 3 rows (6 total) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '2rem',
          marginBottom: '2rem',
          minHeight: 'calc(100vh - 300px)'
        }}>
          {currentVehicles.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem',
              color: '#94a3b8',
              fontSize: '2rem'
            }}>
              No vehicles assigned to you yet.
            </div>
          ) : currentVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              style={{
                backgroundColor: '#1e293b',
                borderRadius: '1rem',
                padding: '2rem',
                border: '2px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#475569'
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#334155'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Vehicle Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    marginBottom: '0.5rem'
                  }}>
                    {vehicle.registration_number}
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    color: '#94a3b8',
                    marginBottom: '0.5rem'
                  }}>
                    {vehicle.vehicle_make} {vehicle.vehicle_model}
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    color: '#cbd5e1'
                  }}>
                    {vehicle.customer_name}
                  </div>
                </div>
                <span style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  backgroundColor: getPriorityColor(vehicle.priority).bg,
                  color: getPriorityColor(vehicle.priority).color
                }}>
                  {vehicle.priority?.toUpperCase() || 'MEDIUM'}
                </span>
              </div>

              {/* Vehicle Details */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                flex: 1
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <Calendar style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8' }} />
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Due Date</div>
                    <div style={{ fontSize: '1.125rem', color: '#cbd5e1', fontWeight: '500' }}>
                      {formatDate(vehicle.estimated_completion_date)}
                    </div>
                  </div>
                </div>

                {vehicle.issues_reported && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}>
                    <AlertCircle style={{ width: '1.5rem', height: '1.5rem', color: '#94a3b8', marginTop: '0.25rem' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Issues/Notes</div>
                      <div style={{ fontSize: '1rem', color: '#cbd5e1' }}>
                        {vehicle.issues_reported || vehicle.accessories_requested || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    backgroundColor: getStatusColor(vehicle.status).bg,
                    color: getStatusColor(vehicle.status).color
                  }}>
                    {vehicle.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #334155'
              }}>
                {vehicle.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateStatus(vehicle.id, 'in_progress')
                    }}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1d4ed8'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb'
                    }}
                  >
                    Start Work
                  </button>
                )}
                {vehicle.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      updateStatus(vehicle.id, 'completed')
                    }}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#047857'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669'
                    }}
                  >
                    Mark Complete
                  </button>
                )}
                {vehicle.status === 'completed' && (
                  <div style={{
                    flex: 1,
                    padding: '1rem',
                    backgroundColor: '#1e293b',
                    color: '#10b981',
                    border: '2px solid #10b981',
                    borderRadius: '0.5rem',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ✓ Completed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            padding: '2rem',
            backgroundColor: '#1e293b',
            borderRadius: '1rem',
            border: '2px solid #334155'
          }}>
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              style={{
                padding: '1rem 2rem',
                backgroundColor: currentPage === 1 ? '#0f172a' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1.25rem',
                fontWeight: '600',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: currentPage === 1 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (currentPage > 1) {
                  e.currentTarget.style.backgroundColor = '#1d4ed8'
                }
              }}
              onMouseOut={(e) => {
                if (currentPage > 1) {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }
              }}
            >
              <ChevronLeft style={{ width: '1.5rem', height: '1.5rem' }} />
              Previous
            </button>

            <div style={{
              fontSize: '1.5rem',
              color: '#ffffff',
              fontWeight: '600',
              minWidth: '200px',
              textAlign: 'center'
            }}>
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{
                padding: '1rem 2rem',
                backgroundColor: currentPage === totalPages ? '#0f172a' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.75rem',
                fontSize: '1.25rem',
                fontWeight: '600',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: currentPage === totalPages ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (currentPage < totalPages) {
                  e.currentTarget.style.backgroundColor = '#1d4ed8'
                }
              }}
              onMouseOut={(e) => {
                if (currentPage < totalPages) {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }
              }}
            >
              Next
              <ChevronRight style={{ width: '1.5rem', height: '1.5rem' }} />
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading your work assignments...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <FullScreenView />
      {!isFullScreen && (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '2rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
              Your Work Dashboard
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748b' }}>
              View and manage your assigned installation work
            </p>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1.5rem', 
            marginBottom: '2rem' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '0.75rem', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#dbeafe', 
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock style={{ width: '2rem', height: '2rem', color: '#2563eb' }} />
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1e293b' }}>
                    {recentVehicles.filter(v => v.status === 'in_progress').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>In Progress</div>
                </div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '0.75rem', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar style={{ width: '2rem', height: '2rem', color: '#d97706' }} />
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1e293b' }}>
                    {recentVehicles.filter(v => v.status === 'pending').length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Pending</div>
                </div>
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '0.75rem', 
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: '#dcfce7', 
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle style={{ width: '2rem', height: '2rem', color: '#059669' }} />
                </div>
                <div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1e293b' }}>
                    {recentVehicles.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Assignments</div>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Vehicles */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ 
              padding: '1.5rem', 
              borderBottom: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Your Assigned Vehicles
              </h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={handleFullScreenToggle}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#1d4ed8'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb'
                  }}
                >
                  <Maximize2 style={{ width: '1rem', height: '1rem' }} />
                  Full Screen View
                </button>
                <button 
                  onClick={loadInstallerWork}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Vehicle</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Customer</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Priority</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Issues</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Due Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        No vehicles assigned to you yet.
                      </td>
                    </tr>
                  ) : recentVehicles.map((vehicle, index) => (
                    <tr key={vehicle.id} style={{ borderBottom: index < recentVehicles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                        <div style={{ fontWeight: '600' }}>{vehicle.registration_number}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {vehicle.vehicle_make} {vehicle.vehicle_model}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                        {vehicle.customer_name}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: getPriorityColor(vehicle.priority).bg,
                          color: getPriorityColor(vehicle.priority).color
                        }}>
                          {vehicle.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', maxWidth: '200px' }}>
                        <div
                          style={{ 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap'
                          }}
                          title={vehicle.issues_reported || vehicle.accessories_requested}
                        >
                          {vehicle.issues_reported || vehicle.accessories_requested || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                        {formatDate(vehicle.estimated_completion_date)}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: getStatusColor(vehicle.status).bg,
                          color: getStatusColor(vehicle.status).color
                        }}>
                          {vehicle.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {vehicle.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(vehicle.id, 'in_progress')}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Start Work
                            </button>
                          )}
                          {vehicle.status === 'in_progress' && (
                            <>
                              <button
                                onClick={() => updateStatus(vehicle.id, 'completed')}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Complete
                              </button>
                            </>
                          )}
                          {vehicle.status === 'completed' && (
                            <span style={{ color: '#059669', fontSize: '0.75rem' }}>✓ Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
    </>
  )
}
