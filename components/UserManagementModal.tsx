'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/rbac'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

interface UserManagementModalProps {
  isOpen: boolean
  onClose: () => void
  editingUser: any
  role: 'installer' | 'manager' | 'coordinator' | 'accountant'
  onSuccess: () => void
}

export default function UserManagementModal({ isOpen, onClose, editingUser, role, onSuccess }: UserManagementModalProps) {
  const [availableDepartments, setAvailableDepartments] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    departments: [] as string[],
    specialization: '',
    status: 'active',
    join_date: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        phone: editingUser.phone || '',
        password: '',
        departments: (editingUser.departments || editingUser.department || '')
          ? Array.isArray(editingUser.departments)
            ? editingUser.departments
            : String(editingUser.department || '')
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
          : [],
        specialization: editingUser.specialization || editingUser.specialization || '',
        status: editingUser.status || 'active',
        join_date: editingUser.join_date || editingUser.joinDate || ''
      })
    } else {
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        departments: [],
        specialization: '',
        status: 'active',
        join_date: ''
      })
    }
    setError('')
  }, [editingUser, isOpen])

  // Load departments when modal opens - FILTER BY TENANT
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const tenantId = getCurrentTenantId()
        const isSuper = isSuperAdmin()
        
        let query = supabase
          .from('departments')
          .select('id, name')
          .eq('status', 'active')
          .order('name', { ascending: true })
        
        // CRITICAL: Filter by tenant_id for data isolation
        if (!isSuper && tenantId) {
          query = query.eq('tenant_id', tenantId)
        }
        
        const { data, error } = await query
        
        if (error) {
          // Check if error is due to missing tenant_id column
          if (error.code === '42703' && error.message?.includes('tenant_id')) {
            console.error('❌ ERROR: tenant_id column is missing in departments table.')
            console.error('📋 SOLUTION: Please run database/multi_tenant_schema.sql in Supabase SQL Editor.')
          } else {
            console.error('Error loading departments:', error)
          }
          setAvailableDepartments([])
          return
        }
        
        setAvailableDepartments(data || [])
      } catch (e) {
        console.error('Error loading departments:', e)
        setAvailableDepartments([])
      }
    }
    if (isOpen) loadDepartments()
  }, [isOpen])

  const getRoleLabel = () => {
    switch (role) {
      case 'installer': return 'Installer'
      case 'manager': return 'Manager'
      case 'coordinator': return 'Coordinator'
      case 'accountant': return 'Accountant'
      default: return 'User'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (editingUser) {
        // Update existing user
        await updateUser()
        onSuccess()
        onClose()
      } else {
        // Create new user
        const result = await createUser()
        onSuccess()
        
        // Show success message with credentials
        const defaultPassword = formData.password || `${formData.email}123!`
        alert(`User created successfully!\n\nEmail: ${formData.email}\nPassword: ${defaultPassword}\n\nPlease save these credentials!`)
        
        onClose()
      }
    } catch (err: any) {
      console.error('Error in form submission:', err)
      const errorMessage = err.message || 'An error occurred while creating the user'
      setError(errorMessage)
      
      // Also show alert for better visibility (if not already shown in createUser)
      if (!errorMessage.includes('User Creation Failed')) {
        alert(`❌ Error: ${errorMessage}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async () => {
    // CRITICAL: Always verify tenant_id from database, not just sessionStorage
    // This prevents using stale tenant_id when switching between tenants
    console.log('🔍 Verifying tenant_id for user creation...')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Cannot create user: Please log in again.')
    }
    
    // Get tenant_id from database based on current user's admin role
    // This ensures we use the CORRECT tenant_id, not a stale one from sessionStorage
    const { data: tenantUser, error: tenantUserError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()
    
    if (tenantUserError || !tenantUser) {
      console.error('❌ Could not find tenant_id for current admin user:', tenantUserError)
      throw new Error('Cannot create user: Tenant ID is required. Please log out and log in again.')
    }
    
    const tenantId = tenantUser.tenant_id
    
    // Update sessionStorage with the correct tenant_id
    if (sessionStorage.getItem('current_tenant_id') !== tenantId) {
      console.warn('⚠️ sessionStorage tenant_id mismatch, updating:', {
        old: sessionStorage.getItem('current_tenant_id'),
        new: tenantId
      })
      sessionStorage.setItem('current_tenant_id', tenantId)
    }
    
    console.log('✅ Using verified tenant_id from database:', tenantId)
    
    if (!tenantId) {
      throw new Error('Cannot create user: Tenant ID is required. Please log out and log in again.')
    }
    
    // Verify tenant_id format
    if (!tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('❌ Invalid tenant_id format:', tenantId)
      throw new Error('Invalid tenant ID format. Please log out and log in again.')
    }
    
    // Log tenant_id for debugging
    console.log('📤 Creating user with:', {
      email: formData.email,
      name: formData.name,
      role: role,
      tenant_id: tenantId,
      phone: formData.phone ? '***' : 'not provided',
      departments: formData.departments?.length || 0,
      status: formData.status,
      join_date: formData.join_date || 'not provided'
    })
    
    // Call API route to create user
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        role: role,
        departments: formData.departments,
        specialization: formData.specialization,
        status: formData.status,
        join_date: formData.join_date,
        tenant_id: tenantId // Link user to current tenant
      })
    })

    let result: any = {}
    let responseText = ''
    
    try {
      responseText = await response.text()
      console.log('Raw API response:', responseText)
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!responseText || responseText.trim() === '') {
        throw new Error(`Empty response from server (${response.status} ${response.statusText})`)
      }
      
      try {
        result = JSON.parse(responseText)
        console.log('Parsed result:', result)
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        console.error('Response text:', responseText)
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
      }
    } catch (jsonError: any) {
      console.error('❌ User creation failed - response parsing error:', jsonError)
      console.error('Response text:', responseText)
      throw new Error(jsonError.message || `Failed to create user: ${response.status} ${response.statusText}`)
    }

    if (!response.ok) {
      console.error('❌ User creation failed - API returned error')
      console.error('Response status:', response.status)
      console.error('Response statusText:', response.statusText)
      console.error('Response text:', responseText)
      console.error('Parsed result:', result)
      console.error('Result keys:', result ? Object.keys(result) : 'result is null/undefined')
      
      // Build error message from available fields
      let errorMessage = result?.error || 
                        result?.details || 
                        result?.message ||
                        result?.fullError ||
                        (typeof result === 'string' ? result : null) ||
                        `Failed to create user (${response.status} ${response.statusText})`
      
      // Include additional context if available
      if (result?.details && result.details !== errorMessage) {
        errorMessage += `\n\nDetails: ${result.details}`
      }
      if (result?.hint) {
        errorMessage += `\n\nHint: ${result.hint}`
      }
      if (result?.existing_user_id) {
        errorMessage += `\n\nExisting User ID: ${result.existing_user_id}`
      }
      if (result?.linked_tenants && Array.isArray(result.linked_tenants)) {
        errorMessage += `\n\nLinked to tenants: ${result.linked_tenants.join(', ')}`
      }
      
      // Show alert with full error details for better visibility
      alert(`❌ User Creation Failed\n\n${errorMessage}\n\nCheck console for more details.`)
      
      throw new Error(errorMessage)
    }

    console.log('✅ User created successfully:', result)
    return result
  }

  const updateUser = async () => {
    // Update profile
    const updatePayload: any = {
      name: formData.name,
      email: formData.email
    }

    // Add role-specific fields if needed
    if (formData.phone) updatePayload.phone = formData.phone
    // Store departments in backward-compatible single column `department`
    if (Array.isArray(formData.departments)) {
      updatePayload.department = formData.departments.join(', ')
    }
    if (formData.specialization) updatePayload.specialization = formData.specialization
    if (formData.status) updatePayload.status = formData.status
    if (formData.join_date) updatePayload.join_date = formData.join_date

    let { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', editingUser.id)

    // If the instance has a `departments` column and we want to use it, try a secondary update silently.
    if (!error && Array.isArray(formData.departments)) {
      const tryArray = await supabase
        .from('profiles')
        .update({ departments: formData.departments })
        .eq('id', editingUser.id)
      // Ignore error here; it's optional and depends on schema
    }

    if (error) throw error

    // Optionally update auth user email if changed
    if (formData.email !== editingUser.email) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        editingUser.id,
        { email: formData.email }
      )
      if (authError) console.error('Failed to update auth email:', authError)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        width: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
            {editingUser ? `Edit ${getRoleLabel()}` : `Add ${getRoleLabel()}`}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#64748b' }} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Password (only for new users) */}
            {!editingUser && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Password (leave empty for auto-generated)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Role-specific fields */}
            {(role === 'manager' || role === 'coordinator' || role === 'installer') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Departments
                </label>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                  border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.5rem'
                }}>
                  {availableDepartments.map((dept) => {
                    const selected = formData.departments.includes(dept.id)
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            departments: selected
                              ? formData.departments.filter((d: string) => d !== dept.id)
                              : [...formData.departments, dept.id]
                          })
                        }}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '9999px',
                          border: '1px solid ' + (selected ? '#2563eb' : '#e2e8f0'),
                          backgroundColor: selected ? '#dbeafe' : 'white',
                          color: selected ? '#1e40af' : '#374151',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        {dept.name}
                      </button>
                    )
                  })}
                  {availableDepartments.length === 0 && (
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>No departments found. Add in Settings → Departments.</span>
                  )}
                </div>
              </div>
            )}

            {role === 'installer' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., AC & Interior"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Status and Join Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Join Date
                </label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e2e8f0',
                backgroundColor: 'white',
                color: '#64748b',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isLoading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
