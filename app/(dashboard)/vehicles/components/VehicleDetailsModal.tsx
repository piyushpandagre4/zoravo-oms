'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, Car, MapPin, Wrench, DollarSign, Calendar, MessageSquare, Send, Package, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VehicleCommentsSection from '@/components/VehicleCommentsSection'

interface VehicleInward {
  id: string
  short_id?: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  customer_city?: string
  customer_state?: string
  customer_pincode?: string
  registration_number?: string
  make?: string
  model?: string
  color?: string
  year?: number
  vehicle_type?: string
  engine_number?: string
  chassis_number?: string
  odometer_reading?: number
  issues_reported?: string
  accessories_requested?: string
  estimated_cost?: number
  priority?: string
  assigned_installer_id?: string
  assigned_manager_id?: string
  location_id?: string
  estimated_completion_date?: string
  notes?: string
  status?: string
  created_at?: string
  updated_at?: string
}

interface VehicleDetailsModalProps {
  vehicle: VehicleInward
  onClose: () => void
  onUpdate?: () => void
}

export default function VehicleDetailsModal({ vehicle, onClose, onUpdate }: VehicleDetailsModalProps) {
  const supabase = createClient()
  
  // State for fetching names
  const [managerName, setManagerName] = useState<string>('Loading...')
  const [locationName, setLocationName] = useState<string>('Loading...')
  const [vehicleTypeName, setVehicleTypeName] = useState<string>('Loading...')
  const [installerName, setInstallerName] = useState<string>('')
  const [products, setProducts] = useState<any[]>([])
  const [currentStatus, setCurrentStatus] = useState<string>(vehicle.status || 'pending')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Fetch related data
  useEffect(() => {
    fetchRelatedData()
    parseProducts()
  }, [vehicle])

  const fetchRelatedData = async () => {
    try {
      // Fetch Manager Name
      if (vehicle.assigned_manager_id) {
        const { data: managerData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', vehicle.assigned_manager_id)
          .single()
        setManagerName(managerData?.name || 'Not Assigned')
      } else {
        setManagerName('Not Assigned')
      }

      // Fetch Location Name
      if (vehicle.location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('name')
          .eq('id', vehicle.location_id)
          .single()
        setLocationName(locationData?.name || 'Not Specified')
      } else {
        setLocationName('Not Specified')
      }

      // Fetch Vehicle Type Name
      if (vehicle.vehicle_type) {
        const { data: vehicleTypeData } = await supabase
          .from('vehicle_types')
          .select('name')
          .eq('id', vehicle.vehicle_type)
          .single()
        setVehicleTypeName(vehicleTypeData?.name || vehicle.vehicle_type || 'Not Specified')
      } else {
        setVehicleTypeName('Not Specified')
      }

      // Fetch Installer Name
      if (vehicle.assigned_installer_id) {
        const { data: installerData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', vehicle.assigned_installer_id)
          .single()
        setInstallerName(installerData?.name || 'Not Assigned')
      }
    } catch (error) {
      console.error('Error fetching related data:', error)
      setManagerName('Error loading')
      setLocationName('Error loading')
      setVehicleTypeName('Error loading')
    }
  }

  const parseProducts = async () => {
    if (vehicle.accessories_requested) {
      try {
        const parsed = JSON.parse(vehicle.accessories_requested)
        if (Array.isArray(parsed)) {
          // Fetch department names for each product
          const productsWithDeptNames = await Promise.all(parsed.map(async (product: any) => {
            if (product.department && typeof product.department === 'string' && product.department.includes('-')) {
              // It's a UUID, fetch the department name
              try {
                const { data: deptData } = await supabase
                  .from('departments')
                  .select('name')
                  .eq('id', product.department)
                  .single()
                
                return {
                  ...product,
                  department: deptData?.name || product.department
                }
              } catch {
                return product
              }
            }
            return product
          }))
          setProducts(productsWithDeptNames)
        } else {
          setProducts([])
        }
      } catch {
        // If not JSON, treat as plain text
        setProducts([])
      }
    } else {
      setProducts([])
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (isUpdatingStatus) return
    
    setIsUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('vehicle_inward')
        .update({ status: newStatus })
        .eq('id', vehicle.id)

      if (error) throw error

      setCurrentStatus(newStatus)
      if (onUpdate) onUpdate()
      alert('Status updated successfully!')
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert(`Failed to update status: ${error.message}`)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getStatusOptions = () => {
    const status = currentStatus.toLowerCase()
    if (status === 'pending') return ['In Progress']
    if (status === 'in_progress') return ['Under Installation']
    if (status === 'under_installation') return ['Installation Complete']
    if (status === 'installation_complete') return ['Complete and Delivered']
    return []
  }

  const statusOptions = getStatusOptions()

  const statusColors = {
    'pending': { bg: '#fef3c7', text: '#92400e' },
    'in_progress': { bg: '#dbeafe', text: '#1e40af' },
    'under_installation': { bg: '#f3e8ff', text: '#7c3aed' },
    'installation_complete': { bg: '#d1fae5', text: '#059669' },
    'complete_and_delivered': { bg: '#dcfce7', text: '#166534' },
    'completed': { bg: '#dcfce7', text: '#166534' },
    'delivered': { bg: '#bbf7d0', text: '#15803d' }
  }

  const priorityColors = {
    'low': { bg: '#dcfce7', text: '#166534' },
    'medium': { bg: '#fef3c7', text: '#92400e' },
    'high': { bg: '#fee2e2', text: '#dc2626' },
    'urgent': { bg: '#fecaca', text: '#991b1b' }
  }

  const currentPriority = vehicle.priority || 'medium'
  const statusColor = statusColors[currentStatus as keyof typeof statusColors] || { bg: '#f1f5f9', text: '#64748b' }
  const priorityColor = priorityColors[currentPriority as keyof typeof priorityColors] || { bg: '#f1f5f9', text: '#64748b' }

  // Helper function to format notes (handles JSON parsing)
  const formatNotes = (notes: string): string => {
    try {
      const parsed = JSON.parse(notes)
      if (typeof parsed === 'object' && parsed !== null) {
        // Format JSON object into readable text
        const formatObject = (obj: any, indent = 0): string => {
          let result = ''
          for (const [key, value] of Object.entries(obj)) {
            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              result += `${'  '.repeat(indent)}${formattedKey}:\n`
              result += formatObject(value, indent + 1)
            } else if (Array.isArray(value)) {
              result += `${'  '.repeat(indent)}${formattedKey}: ${value.join(', ')}\n`
            } else {
              const displayValue = value === '' ? '(Empty)' : value
              result += `${'  '.repeat(indent)}${formattedKey}: ${displayValue}\n`
            }
          }
          return result
        }
        return formatObject(parsed).trim()
      }
    } catch {
      // If not valid JSON, use as-is
    }
    return notes
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}
    onClick={onClose}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
              Vehicle Inward Details
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              ID: {vehicle.short_id || vehicle.id?.substring(0, 8) + '...'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X style={{ width: '1.5rem', height: '1.5rem', color: '#64748b' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Status and Priority Badges */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              backgroundColor: statusColor.bg,
              color: statusColor.text
            }}>
              Status: {currentStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
            <span style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              backgroundColor: priorityColor.bg,
              color: priorityColor.text
            }}>
              Priority: {currentPriority.toUpperCase()}
            </span>
          </div>

          {/* Status Update Section */}
          {statusOptions.length > 0 && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', marginBottom: '0.5rem' }}>
                Update Status
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleStatusUpdate(e.target.value)
                  }}
                  disabled={isUpdatingStatus}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Select new status...</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status.toLowerCase().replace(/\s+/g, '_')}>
                      {status}
                    </option>
                  ))}
                </select>
                {isUpdatingStatus && (
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Updating...</span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Left Column */}
            <div>
              {/* Customer Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                  Customer Information
                </h3>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Name:</strong> {vehicle.customer_name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                    <a href={`tel:${vehicle.customer_phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {vehicle.customer_phone || 'N/A'}
                    </a>
                  </div>
                  {vehicle.customer_email && (
                    <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Mail style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                      <a href={`mailto:${vehicle.customer_email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {vehicle.customer_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Car style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                  Vehicle Information
                </h3>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Registration:</strong> {vehicle.registration_number || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Model:</strong> {vehicle.model || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Make:</strong> {vehicle.make || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                    <strong>Type:</strong> {vehicleTypeName}
                  </div>
                  {vehicle.year && (
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong>Year:</strong> {vehicle.year}
                    </div>
                  )}
                  {vehicle.color && (
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong>Color:</strong> {vehicle.color}
                    </div>
                  )}
                  {vehicle.odometer_reading && (
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong>Odometer:</strong> {vehicle.odometer_reading} km
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Created: {vehicle.created_at ? new Date(vehicle.created_at).toLocaleString('en-IN') : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Assignment Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wrench style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                  Assignment Details
                </h3>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                    <strong>Manager:</strong><br />
                    <span style={{ color: '#64748b' }}>{managerName}</span>
                  </div>
                  {installerName && (
                    <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                      <strong>Installer:</strong><br />
                      <span style={{ color: '#64748b' }}>{installerName}</span>
                    </div>
                  )}
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                    <MapPin style={{ width: '0.875rem', height: '0.875rem', color: '#64748b', marginTop: '0.125rem', flexShrink: 0 }} />
                    <div>
                      <strong>Location:</strong><br />
                      <span style={{ color: '#64748b' }}>{locationName}</span>
                    </div>
                  </div>
                  {vehicle.estimated_completion_date && (
                    <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
                      <Calendar style={{ width: '0.875rem', height: '0.875rem', color: '#64748b', marginTop: '0.125rem', flexShrink: 0 }} />
                      <div>
                        <strong>Est. Completion:</strong><br />
                        <span style={{ color: '#64748b' }}>
                          {new Date(vehicle.estimated_completion_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cost Info */}
              {vehicle.estimated_cost !== undefined && vehicle.estimated_cost !== null && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                    Cost & Revenue
                  </h3>
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      <strong>Estimated Cost:</strong> ₹{vehicle.estimated_cost?.toLocaleString('en-IN') || '0'}
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      <strong>Payment Status:</strong> {currentStatus === 'complete_and_delivered' || currentStatus === 'completed' ? 'Paid' : 'Pending Payment'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          {products.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                Product Details
              </h3>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>Product</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>Brand</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>Department</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', color: '#64748b', fontWeight: '500' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={index} style={{ borderBottom: index === products.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.5rem' }}>{product.product || '-'}</td>
                        <td style={{ padding: '0.5rem' }}>{product.brand || '-'}</td>
                        <td style={{ padding: '0.5rem' }}>{product.department || '-'}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{parseFloat(product.price || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoice Number - Display for all users if exists */}
          {(() => {
            let invoiceNumber = ''
            if (vehicle.notes) {
              try {
                const notesData = JSON.parse(vehicle.notes)
                if (notesData.invoice_number) {
                  invoiceNumber = notesData.invoice_number
                }
              } catch {
                // If parsing fails, invoice number remains empty
              }
            }
            
            if (invoiceNumber) {
              return (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                    Invoice Number
                  </h3>
                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    padding: '1rem', 
                    borderRadius: '0.5rem',
                    borderLeft: '4px solid #0284c7'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.5rem', fontWeight: '600' }}>
                      Invoice Number (External Platform):
                    </div>
                    <div style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '700', 
                      color: '#0c4a6e',
                      letterSpacing: '0.05em'
                    }}>
                      {invoiceNumber}
                    </div>
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Issues and Notes */}
          {(vehicle.issues_reported || vehicle.notes) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.75rem' }}>
                Additional Information
              </h3>
              {vehicle.issues_reported && (
                <div style={{ marginBottom: '0.75rem', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #dc2626' }}>
                  <strong style={{ color: '#dc2626', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    Issues Reported:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
                    {vehicle.issues_reported}
                  </p>
                </div>
              )}
              {vehicle.notes && (
                <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '0.5rem', borderLeft: '4px solid #2563eb' }}>
                  <strong style={{ color: '#2563eb', fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                    Notes:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af', whiteSpace: 'pre-wrap' }}>
                    {formatNotes(vehicle.notes)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div>
            <VehicleCommentsSection vehicleId={vehicle.id} userRole="admin" />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

