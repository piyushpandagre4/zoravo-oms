'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Save, ArrowLeft, Plus, Trash2, Calendar, Clock, User, Phone, Building, MapPin, FileText, Package, DollarSign, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProductItem {
  product: string
  brand: string
  price: string
  department: string
}

export default function VehicleInwardPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  const [currentDateTime, setCurrentDateTime] = useState<string>('')
  const [managers, setManagers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [products, setProducts] = useState<ProductItem[]>([{ product: '', brand: '', price: '', department: '' }])

  const [formData, setFormData] = useState({
    // Auto-filled
    currentDate: '',
    currentTime: '',
    
    // Owner/Vehicle Info
    ownerName: '',
    mobileNumber: '',
    email: '',
    vehicleNumber: '',
    modelName: '',
    make: '',
    year: '',
    color: '',
    odometerReading: '',
    
    // Service Info
    expectedDelivery: '',
    priority: 'medium',
    managerPerson: '',
    location: '',
    issuesReported: '',
    remark: '',
    vehicleType: '',
    
    // Product List (handled separately)
  })

  useEffect(() => {
    // Set IST date and time
    const now = new Date()
    const istDate = now.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: 'Asia/Kolkata'
    })
    const istTime = now.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    })
    
    setCurrentDateTime(`${istDate} ${istTime}`)
    setFormData(prev => ({
      ...prev,
      currentDate: istDate,
      currentTime: istTime
    }))

    // Load dropdown data
    loadManagers()
    loadLocations()
    loadVehicleTypes()
    loadDepartments()
  }, [])

  const loadManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['manager', 'admin'])
        .eq('status', 'active')
      
      if (!error && data) {
        setManagers(data)
      }
    } catch (error) {
      console.error('Error loading managers:', error)
      // Fallback mock data
      setManagers([
        { id: '1', name: 'Priya Sharma', role: 'manager' },
        { id: '2', name: 'Rahul Verma', role: 'manager' }
      ])
    }
  }

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      
      console.log('Loaded locations from database:', data)
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
      alert('Could not load locations. Please add locations in Settings first.')
      setLocations([])
    }
  }

  const loadVehicleTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('status', 'active')
      
      if (!error && data) {
        setVehicleTypes(data)
      }
    } catch (error) {
      console.error('Error loading vehicle types:', error)
      // Fallback mock data
      setVehicleTypes([
        { id: 'retail', name: 'Retail' },
        { id: 'showroom', name: 'Showroom' }
      ])
    }
  }

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('status', 'active')
      
      if (!error && data) {
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error loading departments:', error)
      // Fallback mock data
      setDepartments([
        { id: 'dept1', name: 'Engine' },
        { id: 'dept2', name: 'Electrical' },
        { id: 'dept3', name: 'Body & Paint' }
      ])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addProductRow = () => {
    setProducts([...products, { product: '', brand: '', price: '', department: '' }])
  }

  const removeProductRow = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index))
    }
  }

  const updateProduct = (index: number, field: keyof ProductItem, value: string) => {
    const updated = [...products]
    updated[index][field] = value
    setProducts(updated)
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.ownerName || !formData.mobileNumber || !formData.vehicleNumber || !formData.modelName || !formData.issuesReported.trim()) {
      alert('Please fill in all required fields (Owner Name, Mobile Number, Vehicle Number, Model Name, Issues Reported)')
      return
    }

    setIsSubmitting(true)
    
    try {
      const productData = products.map(p => ({
        product: p.product,
        brand: p.brand,
        price: parseFloat(p.price) || 0,
        department: p.department
      }))

      // Store products as JSON string in accessories_requested if there are products
      const accessoriesText = products.length > 0 && products.some(p => p.product.trim())
        ? JSON.stringify(products.filter(p => p.product.trim()))
        : null

      const payload = {
        customer_name: formData.ownerName,
        customer_phone: formData.mobileNumber,
        customer_email: formData.email || null,
        registration_number: formData.vehicleNumber,
        model: formData.modelName,
        make: formData.make || (formData.modelName ? formData.modelName.split(' ')[0] : 'Unknown'),
        year: formData.year ? parseInt(formData.year) : null,
        color: formData.color || null,
        odometer_reading: formData.odometerReading ? parseInt(formData.odometerReading) : null,
        vehicle_type: formData.vehicleType || null,
        estimated_completion_date: formData.expectedDelivery || null,
        assigned_manager_id: formData.managerPerson || null,
        location_id: formData.location || null,
        issues_reported: formData.issuesReported.trim(),
        notes: formData.remark || null,
        accessories_requested: accessoriesText,
        status: 'pending',
        priority: formData.priority || 'medium'
        // Note: inward_datetime removed - created_at is automatically set by the database
      }

      const { data, error } = await supabase
        .from('vehicle_inward')
        .insert([payload])
        .select('id')
        .single()

      if (error) {
        console.error('Error creating vehicle inward:', error)
        throw error
      }
      
      // Send WhatsApp notification
      try {
        const { notificationWorkflow } = await import('@/lib/notification-workflow')
        await notificationWorkflow.notifyVehicleCreated(data.id, { ...payload, id: data.id })
      } catch (notifError) {
        console.error('Error sending notification:', notifError)
        // Don't block success if notification fails
      }
      
      alert('Vehicle inward submitted successfully!')
      router.push('/inward')
      
    } catch (error: any) {
      console.error('Error submitting vehicle inward:', error)
      alert(`Failed to submit vehicle inward: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '1rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        >
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          Back
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: '0 0 0.25rem 0' }}>
              Vehicle Inward Entry
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Register a new vehicle intake
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#dbeafe', 
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock style={{ width: '1rem', height: '1rem' }} />
              {currentDateTime}
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                backgroundColor: isSubmitting ? '#94a3b8' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              <Save style={{ width: '1rem', height: '1rem' }} />
              {isSubmitting ? 'Submitting...' : 'Submit Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1400px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Owner Information */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User style={{ width: '1.25rem', height: '1.25rem' }} />
              Owner Information
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Owner Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="Enter owner's full name"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter mobile number"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Email Address <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car style={{ width: '1.25rem', height: '1.25rem' }} />
              Vehicle Information
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Vehicle Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value.toUpperCase())}
                  placeholder="e.g., MH31AB1234"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Model Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.modelName}
                  onChange={(e) => handleInputChange('modelName', e.target.value)}
                  placeholder="e.g., Honda City"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Make/Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => handleInputChange('make', e.target.value)}
                  placeholder="e.g., Honda, Toyota, Maruti"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  placeholder="e.g., 2020"
                  min="1950"
                  max={new Date().getFullYear() + 1}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Color
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., White, Black, Silver"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Odometer Reading (km)
                </label>
                <input
                  type="number"
                  value={formData.odometerReading}
                  onChange={(e) => handleInputChange('odometerReading', e.target.value)}
                  placeholder="e.g., 50000"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Expected Delivery and Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar style={{ width: '1.25rem', height: '1.25rem' }} />
                Expected Delivery
              </h2>
              
              <input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => handleInputChange('expectedDelivery', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign style={{ width: '1.25rem', height: '1.25rem' }} />
                Priority
              </h2>
              
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignment Information */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building style={{ width: '1.25rem', height: '1.25rem' }} />
              Assignment Information
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Manager Person
                </label>
                <select
                  value={formData.managerPerson}
                  onChange={(e) => handleInputChange('managerPerson', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select manager</option>
                  {managers.map(mgr => (
                    <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} {loc.address ? `- ${loc.address}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Issues Reported */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem' }} />
              Issues Reported <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            
            <textarea
              value={formData.issuesReported}
              onChange={(e) => handleInputChange('issuesReported', e.target.value)}
              placeholder="Describe the issues reported by the customer or observed during inspection..."
              rows={5}
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6'
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Remark */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
              Remark
            </h2>
            
            <textarea
              value={formData.remark}
              onChange={(e) => handleInputChange('remark', e.target.value)}
              placeholder="Enter any additional notes or remarks..."
              rows={5}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </div>

      {/* Product List - Full Width */}
      <div style={{ marginTop: '1.5rem', backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package style={{ width: '1.25rem', height: '1.25rem' }} />
            Product List
          </h2>
          <button
            onClick={addProductRow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <Plus style={{ width: '1rem', height: '1rem' }} />
            Add Product
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {products.map((product, index) => (
            <div key={index} style={{ 
              display: 'grid', 
              gridTemplateColumns: '2fr 2fr 1fr 2fr auto', 
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <input
                type="text"
                value={product.product}
                onChange={(e) => updateProduct(index, 'product', e.target.value)}
                placeholder="Product Name"
                style={{
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                value={product.brand}
                onChange={(e) => updateProduct(index, 'brand', e.target.value)}
                placeholder="Brand"
                style={{
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <input
                type="number"
                value={product.price}
                onChange={(e) => updateProduct(index, 'price', e.target.value)}
                placeholder="Price"
                style={{
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <select
                value={product.department}
                onChange={(e) => updateProduct(index, 'department', e.target.value)}
                style={{
                  padding: '0.625rem 0.875rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {products.length > 1 && (
                <button
                  onClick={() => removeProductRow(index)}
                  style={{
                    padding: '0.625rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Trash2 style={{ width: '1rem', height: '1rem' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
