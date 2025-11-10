'use client'

import { useState, useEffect } from 'react'
import { Phone, Clock, Play, X, CheckCircle, AlertCircle, Plus, Search, Filter, Edit, Trash, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

export default function CallFollowUpPageClient() {
  const [calls, setCalls] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showOperatorModal, setShowOperatorModal] = useState(false)
  const [showAssignedModal, setShowAssignedModal] = useState(false)
  const [editingCall, setEditingCall] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    caller_name: '',
    caller_number: '',
    person_to_contact: '',
    operator: '',
    assigned_to: '',
    priority: 'medium',
    status: 'pending',
    notes: ''
  })

  // Operators and Assigned Personnel state
  const [operators, setOperators] = useState(['Tanisha Bharti', 'Hardik Chawhan', 'Ankit Rokde'])
  const [assignedPersonnel, setAssignedPersonnel] = useState(['Ankit Rokde', 'Hardik Chawhan', 'Mamta Yadav'])
  const [newOperatorName, setNewOperatorName] = useState('')
  const [newAssignedName, setNewAssignedName] = useState('')

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase
        .from('call_follow_up')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Add tenant filter for data isolation
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        // Check if error is due to missing tenant_id column (PostgreSQL error code 42703 = undefined_column)
        if (error.code === '42703' && error.message?.includes('tenant_id')) {
          console.error('Γ¥î ERROR: tenant_id column is missing in call_follow_up table.')
          console.error('≡ƒôï SOLUTION: Please run this SQL migration in Supabase SQL Editor:')
          console.error('   File: database/add_tenant_id_to_call_follow_up.sql')
          console.error('   This will add the tenant_id column and enable multi-tenant data isolation.')
          alert('Database migration required: Please run database/add_tenant_id_to_call_follow_up.sql in Supabase SQL Editor to add tenant_id column to call_follow_up table.')
        } else {
          // More detailed error logging for other errors
          console.error('Error fetching calls:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }
        setCalls([])
        return
      }

      setCalls(data || [])
    } catch (error: any) {
      // More detailed error logging for catch block
      console.error('Error fetching calls (catch):', {
        message: error?.message || 'Unknown error',
        error: error
      })
      setCalls([])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (editingCall) {
        // Update existing call
        const tenantId = getCurrentTenantId()
        const isSuper = isSuperAdmin()
        
        let updateQuery = supabase
          .from('call_follow_up')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCall.id)
        
        // Add tenant filter for security
        if (!isSuper && tenantId) {
          updateQuery = updateQuery.eq('tenant_id', tenantId)
        }
        
        const { error } = await updateQuery

        if (error) throw error
        alert('Call Follow Up updated successfully!')
      } else {
        // Create new call
        const tenantId = getCurrentTenantId()
        const { error } = await supabase
          .from('call_follow_up')
          .insert({
            ...formData,
            tenant_id: tenantId // Add tenant_id for data isolation
          })

        if (error) throw error
        alert('Call Follow Up added successfully!')
      }

      setShowAddModal(false)
      setEditingCall(null)
      resetForm()
      fetchCalls()
    } catch (error: any) {
      console.error('Error saving call:', error)
      alert(`Failed to save: ${error.message}`)
    }
  }

  const handleEdit = (call: any) => {
    setEditingCall(call)
    setFormData({
      caller_name: call.caller_name || '',
      caller_number: call.caller_number || '',
      person_to_contact: call.person_to_contact || '',
      operator: call.operator || '',
      assigned_to: call.assigned_to || '',
      priority: call.priority || 'medium',
      status: call.status || 'pending',
      notes: call.notes || ''
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this call follow up?')) return

    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let deleteQuery = supabase
        .from('call_follow_up')
        .delete()
        .eq('id', id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await deleteQuery

      if (error) throw error
      alert('Call Follow Up deleted successfully!')
      fetchCalls()
    } catch (error: any) {
      console.error('Error deleting call:', error)
      alert(`Failed to delete: ${error.message}`)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const call = calls.find(c => c.id === id)
      let updateData: any = { status: newStatus }

      // Calculate response time if status is being updated to 'followed_up' or 'completed'
      if (call && (newStatus === 'followed_up' || newStatus === 'completed')) {
        const createdTime = new Date(call.created_at).getTime()
        const now = new Date().getTime()
        const responseTimeMinutes = Math.floor((now - createdTime) / 60000)
        updateData.response_time = responseTimeMinutes
      }

      const { error } = await supabase
        .from('call_follow_up')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      fetchCalls()
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert(`Failed to update status: ${error.message}`)
    }
  }

  const handleAddOperator = () => {
    if (!newOperatorName.trim()) {
      alert('Please enter an operator name')
      return
    }
    if (operators.includes(newOperatorName)) {
      alert('Operator already exists')
      return
    }
    setOperators([...operators, newOperatorName])
    setNewOperatorName('')
  }

  const handleDeleteOperator = (name: string) => {
    setOperators(operators.filter(op => op !== name))
  }

  const handleAddAssigned = () => {
    if (!newAssignedName.trim()) {
      alert('Please enter a person name')
      return
    }
    if (assignedPersonnel.includes(newAssignedName)) {
      alert('Person already exists')
      return
    }
    setAssignedPersonnel([...assignedPersonnel, newAssignedName])
    setNewAssignedName('')
  }

  const handleDeleteAssigned = (name: string) => {
    setAssignedPersonnel(assignedPersonnel.filter(person => person !== name))
  }

  const resetForm = () => {
    setFormData({
      caller_name: '',
      caller_number: '',
      person_to_contact: '',
      operator: '',
      assigned_to: '',
      priority: 'medium',
      status: 'pending',
      notes: ''
    })
    setEditingCall(null)
  }

  // Calculate KPIs
  const activeCalls = calls.filter(c => c.status === 'active').length
  const pendingCalls = calls.filter(c => c.status === 'pending').length
  const followedUpCalls = calls.filter(c => c.status === 'followed_up').length
  const notReceivedCalls = calls.filter(c => c.status === 'not_received').length
  const completedCalls = calls.filter(c => c.status === 'completed').length

  // Filter calls - exclude completed by default unless specifically filtered
  const filteredCalls = calls.filter(call => {
    const matchesSearch = call.caller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          call.caller_number?.includes(searchTerm) ||
                          call.person_to_contact?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || call.status === statusFilter.toLowerCase().replace(' ', '_')
    
    // Exclude completed calls unless user is specifically viewing completed
    if (statusFilter !== 'Completed' && call.status === 'completed') {
      return false
    }
    
    return matchesSearch && matchesStatus
  })

  const formatTimeAgo = (timestamp: string) => {
    const created = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`
    return `${diffDays}d ${diffHours % 24}h ${diffMins % 60}m`
  }

  const priorityColors: Record<string, { bg: string; text: string }> = {
    low: { bg: '#dcfce7', text: '#166534' },
    medium: { bg: '#fef3c7', text: '#92400e' },
    high: { bg: '#fee2e2', text: '#dc2626' },
    urgent: { bg: '#fecaca', text: '#991b1b' }
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push('/trackers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#64748b'
          }}
        >
          <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
          Back to Trackers
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              Call Follow Up
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
              Track and manage customer follow-up calls
            </p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.3)'
            }}
          >
            <Plus style={{ width: '1.25rem', height: '1.25rem' }} />
            Add Call Follow Up
          </button>
        </div>
      </div>

      {/* KPI Cards - Clickable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setStatusFilter('Active')}
          style={{ 
            backgroundColor: statusFilter === 'Active' ? '#fee2e2' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Active' ? '2px solid #dc2626' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle style={{ width: '1.5rem', height: '1.5rem', color: '#dc2626' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{activeCalls}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Active Calls</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('Pending')}
          style={{ 
            backgroundColor: statusFilter === 'Pending' ? '#fef3c7' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Pending' ? '2px solid #f59e0b' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{pendingCalls}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Pending</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('Followed up')}
          style={{ 
            backgroundColor: statusFilter === 'Followed up' ? '#dbeafe' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Followed up' ? '2px solid #2563eb' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{followedUpCalls}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Followed up</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('Not Received')}
          style={{ 
            backgroundColor: statusFilter === 'Not Received' ? '#f1f5f9' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Not Received' ? '2px solid #64748b' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: '1.5rem', height: '1.5rem', color: '#64748b' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{notReceivedCalls}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Not Received</div>
            </div>
          </div>
        </button>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus style={{ width: '1.5rem', height: '1.5rem', color: '#7c3aed' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{calls.length}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Call Entered</div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setStatusFilter('Completed')}
          style={{ 
            backgroundColor: statusFilter === 'Completed' ? '#dcfce7' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Completed' ? '2px solid #059669' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle style={{ width: '1.5rem', height: '1.5rem', color: '#059669' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{completedCalls}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Completed</div>
            </div>
          </div>
        </button>
      </div>

      {/* Search and Filter */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Followed up">Followed up</option>
            <option value="Not Received">Not Received</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Call Outcome</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>CALLER DETAILS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>PERSON TO CONTACT</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>OPERATOR</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ASSIGNED TO</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>PRIORITY</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>TIMESTAMP CALL ADDED</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>RESPONSE TIME</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>NOTE</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No calls found. Add your first call follow up!
                </td>
              </tr>
            ) : (
              filteredCalls.map((call, index) => (
                <tr key={call.id} style={{ borderBottom: index === filteredCalls.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>{call.caller_name}</div>
                    <a href={`tel:${call.caller_number}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {call.caller_number}
                    </a>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>{call.person_to_contact}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>{call.operator}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>{call.assigned_to}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: priorityColors[call.priority]?.bg || '#f1f5f9',
                      color: priorityColors[call.priority]?.text || '#64748b'
                    }}>
                      {call.priority.charAt(0).toUpperCase() + call.priority.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div>{new Date(call.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.75rem' }}>{new Date(call.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#059669' }}>
                    {call.response_time ? (
                      `${Math.floor(call.response_time / 60)}h ${call.response_time % 60}m`
                    ) : (
                      formatTimeAgo(call.created_at)
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{call.notes || '-'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <select
                      value={call.status}
                      onChange={(e) => handleStatusUpdate(call.id, e.target.value)}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="followed_up">Followed up</option>
                      <option value="not_received">Not Received</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(call)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer'
                        }}
                        title="Edit"
                      >
                        <Edit style={{ width: '1rem', height: '1rem' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(call.id)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer'
                        }}
                        title="Delete"
                      >
                        <Trash style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
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
        onClick={() => {
          setShowAddModal(false)
          resetForm()
        }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                {editingCall ? 'Edit' : 'Add New'} Call Follow Up
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                Γ£ò
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Caller Name *
                </label>
                <input
                  type="text"
                  value={formData.caller_name}
                  onChange={(e) => handleInputChange('caller_name', e.target.value)}
                  placeholder="Enter caller name"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Caller Number *
                </label>
                <input
                  type="tel"
                  value={formData.caller_number}
                  onChange={(e) => handleInputChange('caller_number', e.target.value)}
                  placeholder="Enter phone number"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Person to Contact *
                </label>
                <input
                  type="text"
                  value={formData.person_to_contact}
                  onChange={(e) => handleInputChange('person_to_contact', e.target.value)}
                  placeholder="Enter person to contact"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Operator *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={formData.operator}
                    onChange={(e) => handleInputChange('operator', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select an operator...</option>
                    {operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowOperatorModal(true)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Assigned To *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select assigned person...</option>
                    {assignedPersonnel.map(person => (
                      <option key={person} value={person}>{person}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowAssignedModal(true)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="followed_up">Followed up</option>
                  <option value="not_received">Not Received</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter notes..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.caller_name || !formData.caller_number || !formData.person_to_contact || !formData.operator || !formData.assigned_to}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: (!formData.caller_name || !formData.caller_number || !formData.person_to_contact || !formData.operator || !formData.assigned_to) ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: (!formData.caller_name || !formData.caller_number || !formData.person_to_contact || !formData.operator || !formData.assigned_to) ? 'not-allowed' : 'pointer'
                }}
              >
                {editingCall ? 'Update' : 'Add'} Call Follow Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Operators Modal */}
      {showOperatorModal && (
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
        onClick={() => setShowOperatorModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              width: '100%',
              maxWidth: '500px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Manage Operators
              </h2>
              <button
                onClick={() => setShowOperatorModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1.5rem',
                  color: '#64748b'
                }}
              >
                Γ£ò
              </button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                Existing Operators
              </h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {operators.map((operator, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: index < operators.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{operator}</span>
                    <button
                      onClick={() => handleDeleteOperator(operator)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                Add New Operator
              </h3>
              <input
                type="text"
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
                placeholder="Enter operator name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  marginBottom: '1rem'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  onClick={() => {
                    setShowOperatorModal(false)
                    setNewOperatorName('')
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOperator}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Add Operator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Assigned Persons Modal */}
      {showAssignedModal && (
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
        onClick={() => setShowAssignedModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              width: '100%',
              maxWidth: '500px',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Manage Assigned Persons
              </h2>
              <button
                onClick={() => setShowAssignedModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1.5rem',
                  color: '#64748b'
                }}
              >
                Γ£ò
              </button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                Existing Assigned Persons
              </h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {assignedPersonnel.map((person, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: index < assignedPersonnel.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: '0.875rem', color: '#1e293b' }}>{person}</span>
                    <button
                      onClick={() => handleDeleteAssigned(person)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                Add New Assigned Person
              </h3>
              <input
                type="text"
                value={newAssignedName}
                onChange={(e) => setNewAssignedName(e.target.value)}
                placeholder="Enter person name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  marginBottom: '1rem'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  onClick={() => {
                    setShowAssignedModal(false)
                    setNewAssignedName('')
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAssigned}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Add Person
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

