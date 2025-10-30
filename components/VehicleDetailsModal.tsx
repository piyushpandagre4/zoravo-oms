'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { notificationsService } from '@/lib/notifications-service'
import VehicleCommentsSection from './VehicleCommentsSection'

interface Vehicle {
  id: string
  registration_number: string
  make: string
  model: string
  year?: number
  color?: string
  customer?: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  status: string
  created_at: string
  updated_at: string
  issues_reported?: string
  accessories_requested?: string
  estimated_cost?: number
  assigned_installer_id?: string
}

interface VehicleDetailsModalProps {
  vehicle: Vehicle
  onClose: () => void
  onStatusUpdate?: () => void
  canUpdateStatus: boolean
  userRole: string
}

export default function VehicleDetailsModal({ vehicle, onClose, onStatusUpdate, canUpdateStatus, userRole }: VehicleDetailsModalProps) {
  const [updating, setUpdating] = useState(false)
  const [departmentNames, setDepartmentNames] = useState<Map<string, string>>(new Map())
  const supabase = createClient()

  // Fetch department names on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data: departments } = await supabase
          .from('departments')
          .select('id, name')
        if (departments) {
          const deptsMap = new Map(departments.map((dept: any) => [dept.id, dept.name]))
          setDepartmentNames(deptsMap)
        }
      } catch (error) {
        console.error('Error loading departments:', error)
      }
    }
    fetchDepartments()
  }, [])

  const getStatusOptions = () => {
    const currentStatus = vehicle.status?.toLowerCase().trim() || ''
    
    // Installer workflow: pending → in_progress → under_installation → installation_complete
    if (userRole === 'installer') {
      if (currentStatus === 'pending' || currentStatus === 'pending ') {
        return ['in_progress']
      }
      if (currentStatus === 'in_progress' || currentStatus === 'in progress') {
        return ['under_installation']
      }
      if (currentStatus === 'under_installation' || currentStatus === 'under installation') {
        return ['installation_complete']
      }
    }
    
    // Coordinator can update: installation_complete → complete_and_delivered
    if (userRole === 'coordinator' || userRole === 'manager' || userRole === 'admin') {
      if (currentStatus === 'installation_complete') {
        return ['complete_and_delivered']
      }
    }

    return []
  }

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { label: 'Pending', color: '#fef3c7', bgColor: '#92400e' }
      case 'in_progress':
        return { label: 'In Progress', color: '#dbeafe', bgColor: '#1e40af' }
      case 'under_installation':
      case 'under installation':
        return { label: 'Under Installation', color: '#fbbf24', bgColor: '#d97706' }
      case 'installation_complete':
        return { label: 'Installation Complete', color: '#dcfce7', bgColor: '#166534' }
      case 'complete_and_delivered':
        return { label: 'Complete & Delivered', color: '#dcfce7', bgColor: '#166534' }
      default:
        return { label: status, color: '#f1f5f9', bgColor: '#64748b' }
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Update vehicle status to ${newStatus.replace('_', ' ')}?`)) {
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('vehicle_inward')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id)

      if (error) throw error

      // Create notification for status update
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await notificationsService.createStatusUpdateNotification(user.id, vehicle.id, newStatus)
        }
      } catch (notifError) {
        console.error('Error creating notification:', notifError)
      }

      alert('Status updated successfully!')
      if (onStatusUpdate) onStatusUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const statusInfo = getStatusInfo(vehicle.status)
  const statusOptions = getStatusOptions()

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
              Vehicle Details
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              {vehicle.registration_number}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Status Bar */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>Current Status</h3>
              <span style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: statusInfo.color,
                color: statusInfo.bgColor
              }}>
                {statusInfo.label}
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['pending', 'in_progress', 'under_installation', 'installation_complete'].map((status, index) => {
                const statusOrder = ['pending', 'in_progress', 'under_installation', 'installation_complete']
                const currentStatusIndex = statusOrder.indexOf(vehicle.status?.toLowerCase() || '')
                const isCompleted = currentStatusIndex >= index
                const isCurrent = vehicle.status?.toLowerCase() === status
                
                return (
                  <div
                    key={status}
                    style={{
                      flex: 1,
                      height: '0.5rem',
                      backgroundColor: isCompleted ? '#059669' : '#e5e7eb',
                      borderRadius: '0.25rem',
                      position: 'relative',
                      transition: 'all 0.3s'
                    }}
                    title={status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  >
                    {isCurrent && (
                      <div style={{
                        position: 'absolute',
                        top: '-0.5rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '1rem',
                        height: '1rem',
                        backgroundColor: '#059669',
                        borderRadius: '50%',
                        border: '2px solid white',
                        boxShadow: '0 0 0 2px #059669'
                      }}></div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: '#6b7280' }}>
              <span>Pending</span>
              <span>In Progress</span>
              <span>Under Installation</span>
              <span>Complete</span>
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Vehicle Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Make</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>{vehicle.make}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Model</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>{vehicle.model}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Registration</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>{vehicle.registration_number}</div>
              </div>
              {vehicle.year && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Year</div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>{vehicle.year}</div>
                </div>
              )}
              {vehicle.color && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Color</div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>{vehicle.color}</div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          {vehicle.customer && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Customer Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Name</div>
                  <div style={{ fontWeight: '600', color: '#111827' }}>{vehicle.customer.name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Issues & Accessories */}
          {(vehicle.issues_reported || vehicle.accessories_requested) && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>Work Details</h3>
              {vehicle.issues_reported && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Issues Reported</div>
                  <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                    {vehicle.issues_reported}
                  </div>
                </div>
              )}
              {vehicle.accessories_requested && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Accessories Requested</div>
                  <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                    {(() => {
                      try {
                        const products = JSON.parse(vehicle.accessories_requested || '[]')
                        if (Array.isArray(products) && products.length > 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {products.map((product: any, idx: number) => (
                                <div key={idx} style={{ fontSize: '0.875rem', paddingBottom: idx < products.length - 1 ? '0.5rem' : '0', borderBottom: idx < products.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                  <strong>{product.product || 'Product'}</strong>
                                  {product.brand && <span> - {product.brand}</span>}
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
                        return vehicle.accessories_requested
                      } catch {
                        return vehicle.accessories_requested
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Update Actions - Only show if there are options */}
          {statusOptions.length > 0 && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#eff6ff',
              borderRadius: '0.75rem',
              border: '2px solid #3b82f6',
              marginTop: '2rem'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                Update Status
              </h3>
              
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {statusOptions.map((status) => {
                  const isInstallationComplete = status === 'installation_complete'
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      disabled={updating}
                      style={{
                        padding: '1rem 2rem',
                        backgroundColor: isInstallationComplete ? '#059669' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        opacity: updating ? 0.5 : 1,
                        transition: 'all 0.2s',
                        textTransform: 'capitalize',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        flex: statusOptions.length === 1 ? '1' : 'none',
                        minWidth: '200px'
                      }}
                      onMouseEnter={(e) => {
                        if (!updating) {
                          e.currentTarget.style.backgroundColor = isInstallationComplete ? '#047857' : '#1d4ed8'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating) {
                          e.currentTarget.style.backgroundColor = isInstallationComplete ? '#059669' : '#2563eb'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }
                      }}
                    >
                      {updating ? 'Updating...' : `Mark as ${status.replace('_', ' ')}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comments & Attachments Section */}
          <VehicleCommentsSection vehicleId={vehicle.id} userRole={userRole} />
        </div>
      </div>
    </div>
  )
}

