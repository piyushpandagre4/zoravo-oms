'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Car, User, Phone, Mail, MapPin, Calendar, Wrench, DollarSign, FileText, Edit, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function VehicleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (params.id) {
      fetchVehicleDetails(params.id as string)
    }
  }, [params.id])

  const fetchVehicleDetails = async (vehicleId: string) => {
    try {
      setLoading(true)
      
      // For now, use mock data since we're in demo mode
      // In production, this would fetch from Supabase
      const mockVehicle = {
        id: vehicleId,
        regNo: 'MH31AB1234',
        make: 'Honda',
        model: 'City',
        year: 2020,
        color: 'White',
        engineNumber: 'H123456789',
        chassisNumber: 'CH123456789',
        vehicleType: 'Sedan',
        customer: 'John Doe',
        customerPhone: '+91 9876543210',
        customerEmail: 'john@example.com',
        customerAddress: '123 Main Street, Civil Lines',
        customerCity: 'Nagpur',
        customerState: 'Maharashtra',
        customerPincode: '440001',
        status: 'in_progress',
        date: '2025-01-15',
        lastService: '2024-12-01',
        nextService: '2025-06-01',
        totalServices: 3,
        warrantyExpiry: '2025-06-15',
        insuranceExpiry: '2025-03-20',
        workOrders: [
          {
            id: 'WO001',
            type: 'Regular Service',
            status: 'completed',
            assignedTo: 'Rajesh Kumar',
            startDate: '2025-01-15',
            endDate: '2025-01-16',
            cost: 5000,
            description: 'Oil change, filter replacement, brake check'
          },
          {
            id: 'WO002',
            type: 'AC Repair',
            status: 'in_progress',
            assignedTo: 'Vikram Patel',
            startDate: '2025-01-18',
            endDate: null,
            cost: 3000,
            description: 'AC compressor repair and gas refill'
          }
        ],
        invoices: [
          {
            id: 'INV001',
            amount: 5000,
            status: 'paid',
            date: '2025-01-16',
            description: 'Regular Service - WO001'
          },
          {
            id: 'INV002',
            amount: 3000,
            status: 'pending',
            date: '2025-01-18',
            description: 'AC Repair - WO002'
          }
        ]
      }
      
      setVehicle(mockVehicle)
    } catch (error) {
      console.error('Error fetching vehicle details:', error)
      alert('Failed to load vehicle details')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      // Check if Supabase is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Supabase is not configured. Please check your environment variables.')
      }

      // Update status in database using registration number instead of ID
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('registration_number', vehicle.regNo) // Use registration number instead of ID

      if (error) {
        console.error('Supabase error:', error)
        // Check for specific RLS error
        if (error.message && (error.message.includes('infinite recursion') || error.message.includes('policy'))) {
          throw new Error('Database policy error. Please contact administrator to fix RLS policies.')
        }
        // Handle empty error objects
        if (!error.message || Object.keys(error).length === 0) {
          throw new Error('Database connection error. Please check your Supabase configuration and RLS policies.')
        }
        throw new Error(`Database error: ${error.message || 'Unknown error'}`)
      }

      // Update local state
      setVehicle((prev: any) => ({ ...prev, status: newStatus }))
      alert(`Vehicle status updated to ${newStatus}`)
      
    } catch (error: any) {
      console.error('Error updating vehicle status:', error)
      alert(`Failed to update vehicle status: ${error.message}`)
    }
  }

  const handleDeleteVehicle = async () => {
    if (confirm(`Are you sure you want to delete vehicle ${vehicle.regNo}? This action cannot be undone.`)) {
      try {
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', vehicle.id)

        if (error) {
          console.error('Supabase error:', error)
          throw new Error(`Database error: ${error.message}`)
        }

        alert('Vehicle deleted successfully')
        router.push('/vehicles')
        
      } catch (error: any) {
        console.error('Error deleting vehicle:', error)
        alert(`Failed to delete vehicle: ${error.message}`)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#64748b' }}>Loading vehicle details...</div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', color: '#ef4444' }}>Vehicle not found</div>
        <button 
          onClick={() => router.push('/vehicles')}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Back to Vehicles
        </button>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return '#2563eb'
      case 'completed': return '#059669'
      case 'pending': return '#f59e0b'
      case 'delivered': return '#7c3aed'
      default: return '#64748b'
    }
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => router.push('/vehicles')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
              Back to Vehicles
            </button>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                {vehicle.make} {vehicle.model} ({vehicle.regNo})
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                Vehicle ID: {vehicle.id}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select
              value={vehicle.status}
              onChange={(e) => handleStatusUpdate(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                cursor: vehicle.status === 'delivered' ? 'not-allowed' : 'pointer'
              }}
              disabled={vehicle.status === 'delivered'}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
            <button 
              onClick={() => alert('Edit vehicle details')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: vehicle.status === 'delivered' ? 'not-allowed' : 'pointer',
                opacity: vehicle.status === 'delivered' ? 0.5 : 1
              }}
              disabled={vehicle.status === 'delivered'}
            >
              <Edit style={{ width: '1rem', height: '1rem' }} />
              Edit
            </button>
            <button 
              onClick={handleDeleteVehicle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: vehicle.status === 'delivered' ? 'not-allowed' : 'pointer',
                opacity: vehicle.status === 'delivered' ? 0.5 : 1
              }}
              disabled={vehicle.status === 'delivered'}
            >
              <Trash2 style={{ width: '1rem', height: '1rem' }} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['overview', 'work_orders', 'requirements', 'timeline', 'billing'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.5rem',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTab === tab ? '#2563eb' : '#64748b',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Vehicle Information */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car style={{ width: '1.25rem', height: '1.25rem' }} />
                Vehicle Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Registration:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.regNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Make & Model:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.make} {vehicle.model}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Year:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Color:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.color}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Type:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.vehicleType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Engine No:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.engineNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Chassis No:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.chassisNumber}</span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User style={{ width: '1.25rem', height: '1.25rem' }} />
                Customer Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Name:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.customer}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Phone:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Phone style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                    <span style={{ fontWeight: '500' }}>{vehicle.customerPhone}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                    <span style={{ fontWeight: '500' }}>{vehicle.customerEmail}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Address:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin style={{ width: '0.875rem', height: '0.875rem', color: '#64748b' }} />
                    <span style={{ fontWeight: '500' }}>{vehicle.customerAddress}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>City:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.customerCity}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>State:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.customerState}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pincode:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.customerPincode}</span>
                </div>
              </div>
            </div>

            {/* Service Information */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wrench style={{ width: '1.25rem', height: '1.25rem' }} />
                Service Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Status:</span>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    backgroundColor: `${getStatusColor(vehicle.status)}1A`,
                    color: getStatusColor(vehicle.status)
                  }}>
                    {vehicle.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Total Services:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.totalServices}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Last Service:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.lastService}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Next Service:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.nextService}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Warranty Expiry:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.warrantyExpiry}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Insurance Expiry:</span>
                  <span style={{ fontWeight: '500' }}>{vehicle.insuranceExpiry}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'work_orders' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Work Orders</h3>
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}>
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Add Work Order
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {vehicle.workOrders.map((workOrder: any) => (
                <div key={workOrder.id} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                      {workOrder.type} - {workOrder.id}
                    </h4>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(workOrder.status)}1A`,
                      color: getStatusColor(workOrder.status)
                    }}>
                      {workOrder.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div>Assigned to: <span style={{ fontWeight: '500', color: '#1e293b' }}>{workOrder.assignedTo}</span></div>
                    <div>Start Date: <span style={{ fontWeight: '500', color: '#1e293b' }}>{workOrder.startDate}</span></div>
                    <div>End Date: <span style={{ fontWeight: '500', color: '#1e293b' }}>{workOrder.endDate || 'Ongoing'}</span></div>
                    <div>Cost: <span style={{ fontWeight: '500', color: '#1e293b' }}>₹{workOrder.cost}</span></div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    Description: {workOrder.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Billing Information</h3>
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}>
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Create Invoice
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {vehicle.invoices.map((invoice: any) => (
                <div key={invoice.id} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8fafc'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                      Invoice {invoice.id}
                    </h4>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(invoice.status)}1A`,
                      color: getStatusColor(invoice.status)
                    }}>
                      {invoice.status}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div>Amount: <span style={{ fontWeight: '500', color: '#1e293b' }}>₹{invoice.amount}</span></div>
                    <div>Date: <span style={{ fontWeight: '500', color: '#1e293b' }}>{invoice.date}</span></div>
                    <div>Description: <span style={{ fontWeight: '500', color: '#1e293b' }}>{invoice.description}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'requirements' || activeTab === 'timeline') && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
              {activeTab === 'requirements' ? 'Customer Requirements' : 'Timeline'}
            </h3>
            <p style={{ color: '#64748b' }}>
              {activeTab === 'requirements' 
                ? 'Customer requirements and special instructions will be displayed here.'
                : 'Vehicle timeline and audit logs will be displayed here.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}