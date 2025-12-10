'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  priority?: string
  assigned_installer_id?: string
  assigned_manager_id?: string
  location_id?: string
  estimated_completion_date?: string
  notes?: string
  status?: string
  created_at?: string
}

interface JobSheetPrintProps {
  vehicle: VehicleInward
  onClose: () => void
}

export default function JobSheetPrint({ vehicle, onClose }: JobSheetPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  const [managerName, setManagerName] = useState<string>('')
  const [locationName, setLocationName] = useState<string>('')
  const [vehicleTypeName, setVehicleTypeName] = useState<string>('')
  const [installerName, setInstallerName] = useState<string>('')
  const [products, setProducts] = useState<any[]>([])
  const [departmentNames, setDepartmentNames] = useState<Map<string, string>>(new Map())
  const [companyName, setCompanyName] = useState<string>('RS CAR ACCESSORIES')
  const [companyLocation, setCompanyLocation] = useState<string>('')

  useEffect(() => {
    fetchRelatedData()
    parseProducts()
    fetchDepartments()
    fetchCompanySettings()
  }, [vehicle])
  
  // Fetch location from vehicle if company location is not set after company settings are loaded
  useEffect(() => {
    const fetchLocationFromVehicle = async () => {
      // Wait for fetchCompanySettings to complete first
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check current state - if still empty, try vehicle location
      const checkAndSetLocation = async () => {
        if (vehicle.location_id) {
          try {
            const { data: locationData } = await supabase
              .from('locations')
              .select('name, address')
              .eq('id', vehicle.location_id)
              .single()
            
            if (locationData?.name) {
              // Only set if companyLocation is still empty
              setCompanyLocation(prev => prev || locationData.name)
            } else if (locationData?.address) {
              // Extract city from location address
              const parts = locationData.address.split(',').map(p => p.trim())
              if (parts.length >= 2) {
                const cityIndex = parts.length >= 3 ? parts.length - 2 : 1
                const city = parts[cityIndex]
                if (city && city.length > 0) {
                  setCompanyLocation(prev => prev || city)
                }
              }
            }
          } catch (error) {
            console.error('Error fetching location from vehicle:', error)
          }
        }
      }
      
      checkAndSetLocation()
    }
    
    fetchLocationFromVehicle()
  }, [vehicle.location_id])

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
      } else {
        setInstallerName('Not Assigned')
      }
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

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

  const fetchCompanySettings = async () => {
    try {
      // Get current tenant ID
      const tenantId = typeof window !== 'undefined' ? sessionStorage.getItem('current_tenant_id') : null
      const isSuper = typeof window !== 'undefined' ? sessionStorage.getItem('is_super_admin') === 'true' : false
      
      let query = supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['company_name', 'company_address'])
        .eq('setting_group', 'company')
      
      // Filter by tenant_id for tenant-specific settings
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data } = await query
      
      if (data && data.length > 0) {
        const nameSetting = data.find(s => s.setting_key === 'company_name')
        const addressSetting = data.find(s => s.setting_key === 'company_address')
        
        if (nameSetting?.setting_value) {
          setCompanyName(nameSetting.setting_value.toUpperCase())
        } else if (tenantId && !isSuper) {
          // Fallback: Get company name from tenants table
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .single()
          
          if (tenantData?.name) {
            setCompanyName(tenantData.name.toUpperCase())
          }
        }
        
        // Extract location from address if available
        if (addressSetting?.setting_value) {
          const address = addressSetting.setting_value
          // Try to extract city from common address formats
          // Format: "Street, City, State, Pincode" or "Street, City, State"
          const parts = address.split(',').map(p => p.trim())
          if (parts.length >= 2) {
            // City is usually the second-to-last part (before state/pincode)
            const cityIndex = parts.length >= 3 ? parts.length - 2 : 1
            const city = parts[cityIndex]
            if (city && city.length > 0) {
              setCompanyLocation(city)
            }
          }
        }
      } else if (tenantId && !isSuper) {
        // If no settings found, try to get from tenants table
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', tenantId)
          .single()
        
        if (tenantData?.name) {
          setCompanyName(tenantData.name.toUpperCase())
        }
      }
      
    } catch (error) {
      console.error('Error loading company settings:', error)
    }
  }

  const parseProducts = async () => {
    if (vehicle.accessories_requested) {
      try {
        const parsed = JSON.parse(vehicle.accessories_requested)
        if (Array.isArray(parsed)) {
          const productsWithDeptNames = await Promise.all(parsed.map(async (product: any) => {
            if (product.department && typeof product.department === 'string' && product.department.includes('-')) {
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
          setProducts(productsWithDeptNames.filter((p: any) => p.product && p.product.trim()))
        } else {
          setProducts([])
        }
      } catch {
        setProducts([])
      }
    } else {
      setProducts([])
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Job Sheet - ${vehicle.registration_number || vehicle.short_id || vehicle.id}</title>
              <style>
                @page {
                  size: A4;
                  margin: 8mm;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  font-family: 'Arial', sans-serif;
                  font-size: 8pt;
                  line-height: 1.2;
                  color: #000;
                  background: white;
                }
                .header {
                  border-bottom: 2px solid #2563eb;
                  padding-bottom: 4px;
                  margin-bottom: 6px;
                }
                .header-top {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 6px;
                  padding-bottom: 6px;
                  border-bottom: 1px solid #e2e8f0;
                }
                .logo-section {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  flex-shrink: 0;
                }
                .logo-svg {
                  width: 45px;
                  height: 38px;
                  flex-shrink: 0;
                }
                .logo-text {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                }
                .logo-text-main {
                  font-size: 12pt;
                  font-weight: 600;
                  color: #1e293b;
                  letter-spacing: 0.05em;
                  text-transform: uppercase;
                }
                .logo-text-sub {
                  font-size: 8pt;
                  font-weight: 500;
                  color: #64748b;
                  letter-spacing: 0.05em;
                  text-transform: uppercase;
                }
                .company-header-section {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  flex: 1;
                  padding: 0 15px;
                }
                .company-name-main {
                  font-size: 16pt;
                  font-weight: 700;
                  color: #1e293b;
                  margin-bottom: 2px;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                }
                .company-location-main {
                  font-size: 8pt;
                  color: #64748b;
                  font-weight: 500;
                }
                .header-bottom {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-top: 4px;
                }
                .header h1 {
                  color: #2563eb;
                  font-size: 14pt;
                  margin-bottom: 1px;
                  font-weight: bold;
                }
                .header .subtitle {
                  color: #64748b;
                  font-size: 7pt;
                }
                .section {
                  margin-bottom: 6px;
                  page-break-inside: avoid;
                }
                .section-title {
                  background: #f1f5f9;
                  padding: 3px 6px;
                  font-weight: bold;
                  font-size: 9pt;
                  color: #1e293b;
                  border-left: 3px solid #2563eb;
                  margin-bottom: 4px;
                }
                .info-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 4px;
                  margin-bottom: 4px;
                }
                .info-grid[style*="grid-template-columns: 1fr 1fr 1fr"] {
                  grid-template-columns: 1fr 1fr 1fr !important;
                  gap: 4px !important;
                }
                .info-item {
                  margin-bottom: 2px;
                }
                .info-label {
                  font-weight: bold;
                  color: #475569;
                  font-size: 7pt;
                  margin-bottom: 1px;
                }
                .info-value {
                  color: #0f172a;
                  font-size: 8pt;
                  padding: 1px 0;
                  border-bottom: 1px dotted #cbd5e1;
                }
                .full-width {
                  grid-column: 1 / -1;
                }
                .products-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 4px;
                  font-size: 9pt;
                  table-layout: fixed;
                }
                .products-table th {
                  background: #f1f5f9;
                  padding: 4px 4px;
                  text-align: left;
                  font-weight: bold;
                  border: 1px solid #cbd5e1;
                  font-size: 8pt;
                  font-weight: 700;
                  word-wrap: break-word;
                  overflow: hidden;
                }
                .products-table td {
                  padding: 4px 4px;
                  border: 1px solid #cbd5e1;
                  font-size: 8pt;
                  font-weight: 600;
                  vertical-align: middle;
                  word-wrap: break-word;
                  overflow: hidden;
                }
                .status-checkbox {
                  width: 12px;
                  height: 12px;
                  border: 1.5px solid #2563eb;
                  display: inline-block;
                  margin-right: 4px;
                  vertical-align: middle;
                }
                .status-cell {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                }
                .status-text {
                  font-size: 6pt;
                  color: #64748b;
                }
                .footer {
                  margin-top: 6px;
                  padding-top: 4px;
                  border-top: 1px solid #e2e8f0;
                  font-size: 6pt;
                  color: #64748b;
                  text-align: center;
                }
                .signature-section {
                  margin-top: 8px;
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 20px;
                }
                .signature-box {
                  border-top: 2px solid #000;
                  padding-top: 4px;
                  text-align: center;
                  font-size: 8pt;
                }
                .signature-label {
                  font-weight: bold;
                  margin-top: 3px;
                }
                .notes-box {
                  background: #f8fafc;
                  padding: 4px;
                  border-radius: 3px;
                  font-size: 7pt;
                  border: 1px solid #e2e8f0;
                  margin-top: 2px;
                }
                @media print {
                  body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Format notes - handle JSON format and convert to readable text
  const formatNotes = (notes?: string): string => {
    if (!notes) return ''
    
    try {
      // Try to parse as JSON
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
      // If not valid JSON, return as-is
    }
    
    return notes
  }

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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        position: 'relative'
      }}>
        {/* Action Buttons */}
        <div className="no-print" style={{
          flexShrink: 0,
          backgroundColor: 'white',
          padding: '1rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            Job Sheet Preview
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
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
              <Printer style={{ width: '1rem', height: '1rem' }} />
              Print Job Sheet
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
            </button>
          </div>
        </div>

        {/* Print Content - Scrollable */}
        <div ref={printRef} style={{ 
          padding: '15px', 
          backgroundColor: 'white',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0
        }}>
          {/* Header */}
          <div className="header">
            <div className="header-top">
              <div className="logo-section">
                <svg
                  className="logo-svg"
                  viewBox="0 0 100 85"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: '45px', height: '38px', flexShrink: 0 }}
                >
                  <path
                    d="M10 5 L90 5 L90 25 L35 25 L90 60 L90 80 L10 80 L10 60 L65 60 L10 25 Z"
                    fill="#06b6d4"
                  />
                  <path
                    d="M35 60 L30 55 Q25 50, 25 45 L25 48 L75 48 L75 45 Q75 50, 70 55 L65 60"
                    fill="#06b6d4"
                  />
                  <path
                    d="M35 60 Q30 55, 25 50"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.8"
                  />
                  <path
                    d="M65 60 Q70 55, 75 50"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.8"
                  />
                  <path
                    d="M28 68 Q30 70, 35 68 Q40 66, 45 68 Q50 70, 55 68 Q60 66, 65 68 Q70 70, 72 68"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <ellipse cx="38" cy="68" rx="8" ry="5" fill="none" stroke="#06b6d4" strokeWidth="3" />
                  <ellipse cx="62" cy="68" rx="8" ry="5" fill="none" stroke="#06b6d4" strokeWidth="3" />
                </svg>
                <div className="logo-text">
                  <div className="logo-text-main">ZORAVO</div>
                  <div className="logo-text-sub">OMS</div>
                </div>
              </div>
              <div className="company-header-section">
                <div className="company-name-main">{companyName}</div>
              </div>
              <div style={{ width: '120px', flexShrink: 0 }}></div>
            </div>
            <div className="header-bottom">
              <div>
                <h1 style={{ margin: 0, fontSize: '18pt', color: '#2563eb', fontWeight: 'bold' }}>JOB SHEET</h1>
                <div className="subtitle" style={{ color: '#64748b', fontSize: '8pt', marginTop: '2px' }}>
                  Vehicle Installation & Service Record
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9pt', color: '#1e293b' }}>
                  Job ID: {vehicle.short_id || vehicle.id.substring(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '2px' }}>
                  Date: {formatDate(vehicle.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Combined: Vehicle, Customer & Assignment Information */}
          <div className="section">
            <div className="section-title">VEHICLE, CUSTOMER & ASSIGNMENT INFORMATION</div>
            <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              {/* Vehicle Info */}
              <div className="info-item">
                <div className="info-label">Registration Number</div>
                <div className="info-value">{vehicle.registration_number || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Make & Model</div>
                <div className="info-value">{vehicle.make || 'N/A'} {vehicle.model || ''}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Year / Color</div>
                <div className="info-value">{vehicle.year || 'N/A'} / {vehicle.color || 'N/A'}</div>
              </div>
              
              {/* Customer Info */}
              <div className="info-item">
                <div className="info-label">Customer Name</div>
                <div className="info-value">{vehicle.customer_name || 'N/A'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Phone</div>
                <div className="info-value">{vehicle.customer_phone || 'N/A'}</div>
              </div>
              {vehicle.customer_email && (
                <div className="info-item">
                  <div className="info-label">Email</div>
                  <div className="info-value" style={{ fontSize: '8pt' }}>{vehicle.customer_email}</div>
                </div>
              )}
              
              {/* Assignment Info */}
              <div className="info-item">
                <div className="info-label">Assigned Manager</div>
                <div className="info-value">{managerName}</div>
              </div>
              {installerName && installerName !== 'Not Assigned' && (
                <div className="info-item">
                  <div className="info-label">Assigned Installer</div>
                  <div className="info-value">{installerName}</div>
                </div>
              )}
              <div className="info-item">
                <div className="info-label">Location</div>
                <div className="info-value">{locationName}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Priority</div>
                <div className="info-value" style={{ textTransform: 'capitalize' }}>
                  {vehicle.priority || 'Medium'}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Status</div>
                <div className="info-value" style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                  {vehicle.status?.replace('_', ' ') || 'Pending'}
                </div>
              </div>
              {vehicle.estimated_completion_date && (
                <div className="info-item">
                  <div className="info-label">Expected Completion</div>
                  <div className="info-value">{formatDate(vehicle.estimated_completion_date)}</div>
                </div>
              )}
            </div>
            {(vehicle.customer_address || vehicle.customer_city) && (
              <div className="info-item" style={{ marginTop: '4px' }}>
                <div className="info-label">Customer Address</div>
                <div className="info-value" style={{ fontSize: '8pt' }}>
                  {[
                    vehicle.customer_address,
                    vehicle.customer_city,
                    vehicle.customer_state,
                    vehicle.customer_pincode
                  ].filter(Boolean).join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Work Details */}
          <div className="section">
            <div className="section-title">WORK DETAILS</div>
            {vehicle.issues_reported && (
              <div style={{ marginBottom: '4px' }}>
                <div className="info-label">Issues Reported</div>
                <div className="notes-box">
                  {vehicle.issues_reported}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '4px' }}>
              <div className="info-label" style={{ marginBottom: '4px', fontSize: '9pt', fontWeight: 'bold' }}>Accessories/Products to Install</div>
              <table className="products-table">
                <thead>
                  <tr>
                    <th style={{ width: '4%' }}>#</th>
                    <th style={{ width: '38%' }}>Product Name</th>
                    <th style={{ width: '20%' }}>Brand</th>
                    <th style={{ width: '20%' }}>Department</th>
                    <th style={{ width: '18%', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: any, index: number) => (
                    <tr key={index}>
                      <td style={{ fontWeight: '700', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ fontWeight: '700' }}>{product.product || 'N/A'}</td>
                      <td style={{ fontWeight: '700' }}>{product.brand || 'N/A'}</td>
                      <td style={{ fontWeight: '700' }}>{product.department || 'N/A'}</td>
                      <td>
                        <div className="status-cell">
                          <div className="status-checkbox"></div>
                          <span className="status-text" style={{ fontSize: '7pt', fontWeight: '600' }}>Completed</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Add 3 empty rows */}
                  {Array.from({ length: 3 }).map((_, index) => (
                    <tr key={`empty-${index}`}>
                      <td style={{ fontWeight: '700', textAlign: 'center' }}>{products.length + index + 1}</td>
                      <td style={{ fontWeight: '700' }}>&nbsp;</td>
                      <td style={{ fontWeight: '700' }}>&nbsp;</td>
                      <td style={{ fontWeight: '700' }}>&nbsp;</td>
                      <td>
                        <div className="status-cell">
                          <div className="status-checkbox"></div>
                          <span className="status-text" style={{ fontSize: '7pt', fontWeight: '600' }}>Pending</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-label">Installer Signature</div>
              <div style={{ marginTop: '25px', fontSize: '8pt', color: '#64748b' }}>Date: _______________</div>
            </div>
            <div className="signature-box">
              <div className="signature-label">Customer Signature</div>
              <div style={{ marginTop: '25px', fontSize: '8pt', color: '#64748b' }}>Date: _______________</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <div style={{ marginBottom: '3px', fontWeight: 'bold' }}>Zoravo OMS - Job Sheet</div>
            <div>Generated on {formatDateTime(new Date().toISOString())}</div>
            <div style={{ marginTop: '3px', fontSize: '7pt' }}>
              This is an official record. Please retain for your records.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

