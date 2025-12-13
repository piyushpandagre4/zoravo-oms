'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit, Upload, Send, X, Calendar, Car, FileText, CheckCircle, User, Clipboard, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

export default function RequirementsPageClient() {
  const [requirements, setRequirements] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [commentAttachmentsMap, setCommentAttachmentsMap] = useState<{[key: string]: any[]}>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedCommentFiles, setSelectedCommentFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_number: '',
    vehicle_name: '',
    description: '',
    priority: 'medium',
    status: 'pending'
  })

  useEffect(() => {
    fetchRequirements()
  }, [])

  const fetchRequirements = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase
        .from('customer_requirements')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        // Check if error is due to missing tenant_id column (PostgreSQL error code 42703 = undefined_column)
        if (error.code === '42703' && error.message?.includes('tenant_id')) {
          console.error('ERROR: tenant_id column is missing in customer_requirements table.')
          console.error('SOLUTION: Please run this SQL migration in Supabase SQL Editor:')
          console.error('   File: database/add_tenant_id_to_customer_requirements.sql')
          console.error('   This will add the tenant_id column and enable multi-tenant data isolation.')
          alert('Database migration required: Please run database/add_tenant_id_to_customer_requirements.sql in Supabase SQL Editor to add tenant_id column to customer_requirements table.')
        } else {
          console.error('Error fetching requirements:', error.message)
        }
        setRequirements([])
        return
      }
      
      setRequirements(data || [])
    } catch (error: any) {
      console.error('Error fetching requirements:', error?.message || 'Unknown error')
      setRequirements([])
    }
  }

  const fetchComments = async (requirementId: string) => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let commentsQuery = supabase
        .from('customer_requirements_comments')
        .select('*')
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: false })
      
      // Add tenant filter if tenant_id column exists
      if (!isSuper && tenantId) {
        commentsQuery = commentsQuery.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await commentsQuery

      if (error) {
        // Ignore tenant_id column errors for now (will be fixed by migration)
        if (error.code === '42703' && error.message?.includes('tenant_id')) {
          // Fallback: query without tenant_id filter
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('customer_requirements_comments')
            .select('*')
            .eq('requirement_id', requirementId)
            .order('created_at', { ascending: false })
          
          if (fallbackError) throw fallbackError
          setComments(fallbackData || [])
          return
        }
        throw error
      }
      
      setComments(data || [])
      
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        let attachmentsQuery = supabase
          .from('customer_requirements_comment_attachments')
          .select('*')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: false })
        
        // Add tenant filter if tenant_id column exists
        if (!isSuper && tenantId) {
          attachmentsQuery = attachmentsQuery.eq('tenant_id', tenantId)
        }
        
        const { data: attachmentsData, error: attachmentsError } = await attachmentsQuery
        
        // Ignore tenant_id column errors for attachments (will be fixed by migration)
        if (attachmentsError && attachmentsError.code === '42703' && attachmentsError.message?.includes('tenant_id')) {
          // Fallback: query without tenant_id filter
          const { data: fallbackAttachments } = await supabase
            .from('customer_requirements_comment_attachments')
            .select('*')
            .in('comment_id', commentIds)
            .order('created_at', { ascending: false })
          
          if (fallbackAttachments) {
            const attachmentsMap: {[key: string]: any[]} = {}
            fallbackAttachments.forEach(att => {
              if (!attachmentsMap[att.comment_id]) {
                attachmentsMap[att.comment_id] = []
              }
              attachmentsMap[att.comment_id].push(att)
            })
            setCommentAttachmentsMap(attachmentsMap)
          }
        } else if (attachmentsData) {
          const attachmentsMap: {[key: string]: any[]} = {}
          attachmentsData.forEach(att => {
            if (!attachmentsMap[att.comment_id]) {
              attachmentsMap[att.comment_id] = []
            }
            attachmentsMap[att.comment_id].push(att)
          })
          setCommentAttachmentsMap(attachmentsMap)
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value || '' }))
  }

  const handleSubmit = async () => {
    try {
      let requirementId: string
      
      if (selectedRequirement?.editing) {
        // Update existing
        const tenantId = getCurrentTenantId()
        const isSuper = isSuperAdmin()
        
        let updateQuery = supabase
          .from('customer_requirements')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', selectedRequirement.id)
        
        // Add tenant filter for security
        if (!isSuper && tenantId) {
          updateQuery = updateQuery.eq('tenant_id', tenantId)
        }
        
        const { error, data } = await updateQuery.select('id').single()
        if (error) throw error
        requirementId = data.id
      } else {
        // Create new
        const tenantId = getCurrentTenantId()
        const { error, data } = await supabase
          .from('customer_requirements')
          .insert({ 
            ...formData,
            tenant_id: tenantId // Add tenant_id for data isolation
          })
          .select('id')
          .single()
        if (error) throw error
        requirementId = data.id
      }

      // Upload files if any
      if (selectedFiles.length > 0) {
        const tenantId = getCurrentTenantId()
        for (const file of selectedFiles) {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const filePath = `${requirementId}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('service-attachments')
            .upload(filePath, file)
          if (uploadError) throw uploadError

          const { data: urlData } = await supabase.storage
            .from('service-attachments')
            .getPublicUrl(filePath)

          await supabase
            .from('customer_requirements_attachments')
            .insert({
              requirement_id: requirementId,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type,
              file_size: file.size,
              tenant_id: tenantId || null // Add tenant_id for data isolation
            })
        }

        // Update count
        const { data: allAttachments } = await supabase
          .from('customer_requirements_attachments')
          .select('id')
          .eq('requirement_id', requirementId)
        
        await supabase
          .from('customer_requirements')
          .update({ attachments_count: allAttachments?.length || 0 })
          .eq('id', requirementId)
      }

      setShowAddModal(false)
      setSelectedRequirement(null)
      resetForm()
      fetchRequirements()
    } catch (error: any) {
      console.error('Error saving requirement:', error)
      alert(`Failed to save: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this requirement?')) return
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let deleteQuery = supabase
        .from('customer_requirements')
        .delete()
        .eq('id', id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await deleteQuery
      if (error) throw error
      fetchRequirements()
    } catch (error: any) {
      alert(`Failed to delete: ${error.message}`)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('customer_requirements')
        .update({ status: newStatus })
        .eq('id', id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery
      if (error) throw error
      fetchRequirements()
    } catch (error: any) {
      alert(`Failed to update: ${error.message}`)
    }
  }

  const handleOpenComments = async (requirement: any) => {
    setSelectedRequirement(requirement)
    setComments([])
    setCommentAttachmentsMap({})
    setNewComment('')
    setSelectedCommentFiles([])
    setShowCommentsModal(true)
    await fetchComments(requirement.id)
  }

  const handleAddComment = async () => {
    if (!newComment.trim() && selectedCommentFiles.length === 0) return

    try {
      // Get current user's name
      const { data: { user } } = await supabase.auth.getUser()
      let createdByName = 'User'
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()
        
        if (profile?.name) {
          createdByName = profile.name
        } else if (user.user_metadata?.name) {
          createdByName = user.user_metadata.name
        } else if (user.email) {
          createdByName = user.email.split('@')[0] // Use email username as fallback
        }
      }
      
      const tenantId = getCurrentTenantId()
      const { data: commentData, error: commentError } = await supabase
        .from('customer_requirements_comments')
        .insert({
          requirement_id: selectedRequirement.id,
          comment: newComment.trim() || '(No comment text)',
          created_by: createdByName,
          attachments_count: selectedCommentFiles.length,
          tenant_id: tenantId || null // Add tenant_id for data isolation
        })
        .select('id')
        .single()

      if (commentError) throw commentError

      if (selectedCommentFiles.length > 0) {
        for (const file of selectedCommentFiles) {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const filePath = `${selectedRequirement.id}/comments/${commentData.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('service-attachments')
            .upload(filePath, file)
          if (uploadError) throw uploadError

          const { data: urlData } = await supabase.storage
            .from('service-attachments')
            .getPublicUrl(filePath)

          await supabase
            .from('customer_requirements_comment_attachments')
            .insert({
              comment_id: commentData.id,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type,
              file_size: file.size,
              tenant_id: tenantId || null // Add tenant_id for data isolation
            })
        }
      }

      await supabase
        .from('customer_requirements')
        .update({ comments_count: comments.length + 1 })
        .eq('id', selectedRequirement.id)

      setNewComment('')
      setSelectedCommentFiles([])
      fetchComments(selectedRequirement.id)
      fetchRequirements()
    } catch (error: any) {
      console.error('Error adding comment:', error)
      alert(`Failed to add comment: ${error.message}`)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      await supabase.from('customer_requirements_comments').delete().eq('id', commentId)
      await supabase
        .from('customer_requirements')
        .update({ comments_count: Math.max(0, comments.length - 1) })
        .eq('id', selectedRequirement.id)
      fetchComments(selectedRequirement.id)
      fetchRequirements()
    } catch (error: any) {
      alert(`Failed to delete: ${error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_number: '',
      vehicle_name: '',
      description: '',
      priority: 'medium',
      status: 'pending'
    })
    setSelectedRequirement(null)
    setSelectedFiles([])
  }

  // Calculate KPIs
  const pending = requirements.filter(r => r.status === 'pending').length
  const inProgress = requirements.filter(r => r.status === 'in_progress').length
  const ordered = requirements.filter(r => r.status === 'ordered').length
  const procedure = requirements.filter(r => r.status === 'procedure').length
  const contacted = requirements.filter(r => r.status === 'contacted').length
  const completed = requirements.filter(r => r.status === 'completed').length

  // Filter requirements - exclude completed by default unless explicitly selected
  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Hide completed items from default view unless "Completed" filter is explicitly selected
    if (req.status === 'completed' && statusFilter !== 'completed') {
      return false
    }
    
    const matchesStatus = statusFilter === 'All' || req.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const priorityColors: any = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444'
  }

  const statusColors: any = {
    pending: '#f59e0b',
    in_progress: '#3b82f6',
    ordered: '#8b5cf6',
    procedure: '#06b6d4',
    contacted: '#14b8a6',
    completed: '#10b981'
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Back to Trackers Button */}
      <button
        onClick={() => router.push('/trackers')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'transparent',
          border: '1px solid #e2e8f0',
          borderRadius: '0.375rem',
          color: '#64748b',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: 'pointer'
        }}
      >
        <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
        Back to Trackers
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b', margin: '0 0 0.5rem 0' }}>
            Customer Requirement
          </h1>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
            Track customer service requirements and requests
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
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Plus style={{ width: '1rem', height: '1rem' }} />
          Add Requirement
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setStatusFilter('pending')}
          style={{ 
            backgroundColor: statusFilter === 'pending' ? '#fef3c7' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'pending' ? '2px solid #f59e0b' : 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calendar style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{pending}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Pending</div>
            </div>
          </div>
        </button>
        
        <button 
          onClick={() => setStatusFilter('in_progress')}
          style={{ 
            backgroundColor: statusFilter === 'in_progress' ? '#dbeafe' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'in_progress' ? '2px solid #3b82f6' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Car style={{ width: '2rem', height: '2rem', color: '#3b82f6' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{inProgress}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>In Progress</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('ordered')}
          style={{ 
            backgroundColor: statusFilter === 'ordered' ? '#f3e8ff' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'ordered' ? '2px solid #8b5cf6' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileText style={{ width: '2rem', height: '2rem', color: '#8b5cf6' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{ordered}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Ordered</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('procedure')}
          style={{ 
            backgroundColor: statusFilter === 'procedure' ? '#cffafe' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'procedure' ? '2px solid #06b6d4' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Clipboard style={{ width: '2rem', height: '2rem', color: '#06b6d4' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{procedure}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Procedure</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('contacted')}
          style={{ 
            backgroundColor: statusFilter === 'contacted' ? '#ccfbf1' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'contacted' ? '2px solid #14b8a6' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <User style={{ width: '2rem', height: '2rem', color: '#14b8a6' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{contacted}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Contacted</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('completed')}
          style={{ 
            backgroundColor: statusFilter === 'completed' ? '#dcfce7' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'completed' ? '2px solid #10b981' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle style={{ width: '2rem', height: '2rem', color: '#10b981' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{completed}</div>
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
              placeholder="Search requirements..."
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
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="ordered">Ordered</option>
            <option value="procedure">Procedure</option>
            <option value="contacted">Contacted</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Active Customer Requirements</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>CUSTOMER DETAILS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>DESCRIPTION</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>PRIORITY</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>TIMESTAMP CREATED</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ATTACHMENTS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>COMMENTS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequirements.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No requirements found
                </td>
              </tr>
            ) : (
              filteredRequirements.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                    <div style={{ fontWeight: '500' }}>{req.customer_name}</div>
                    <a href={`tel:${req.customer_number}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.75rem' }}>
                      {req.customer_number}
                    </a>
                    {req.vehicle_name && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Car style={{ width: '0.875rem', height: '0.875rem' }} />
                        {req.vehicle_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{req.description}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.75rem', 
                      fontWeight: '500',
                      backgroundColor: priorityColors[req.priority] + '20',
                      color: priorityColors[req.priority]
                    }}>
                      {req.priority}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                    {new Date(req.created_at).toLocaleDateString('en-GB')}
                    <div style={{ fontSize: '0.75rem' }}>{new Date(req.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                    <button onClick={() => handleOpenComments(req)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
                      <Upload style={{ width: '1rem', height: '1rem' }} />
                      {req.attachments_count || 0}
                    </button>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                    <button onClick={() => handleOpenComments(req)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
                      <FileText style={{ width: '1rem', height: '1rem' }} />
                      {req.comments_count || 0}
                    </button>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select
                      value={req.status}
                      onChange={(e) => handleStatusUpdate(req.id, e.target.value)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        border: `1px solid ${statusColors[req.status]}`,
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        color: statusColors[req.status]
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="ordered">Ordered</option>
                      <option value="procedure">Procedure</option>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setFormData({ 
                            customer_name: req.customer_name || '',
                            customer_number: req.customer_number || '',
                            vehicle_name: req.vehicle_name || '',
                            description: req.description || '',
                            priority: req.priority || 'medium',
                            status: req.status || 'pending'
                          })
                          setSelectedRequirement({ ...req, editing: true })
                          setShowAddModal(true)
                        }}
                        style={{
                          padding: '0.375rem',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Edit"
                      >
                        <Edit style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(req.id)}
                        style={{
                          padding: '0.375rem',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Delete"
                      >
                        <Trash2 style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />
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
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
          <div style={{
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
                {selectedRequirement?.editing ? 'Edit' : 'Add'} Requirement
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
                <X style={{ width: '1.5rem', height: '1.5rem', color: '#64748b' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    placeholder="Enter customer name"
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
                    Customer Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.customer_number}
                    onChange={(e) => handleInputChange('customer_number', e.target.value)}
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
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  value={formData.vehicle_name || ''}
                  onChange={(e) => handleInputChange('vehicle_name', e.target.value)}
                  placeholder="Enter vehicle name (e.g., Honda City, Toyota Innova)"
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
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter requirement description"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Priority
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
                  </select>
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
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="ordered">Ordered</option>
                    <option value="procedure">Procedure</option>
                    <option value="contacted">Contacted</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Attachments (Photo, PDF, Video) - Optional
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(Array.from(e.target.files))
                    }
                  }}
                  style={{ display: 'none' }}
                  id="requirement-file-input"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('requirement-file-input')?.click()}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <Upload style={{ width: '1rem', height: '1rem' }} />
                  Choose files
                  <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                    {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'No file chosen'}
                  </span>
                </button>
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: '#64748b', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', marginBottom: '0.25rem' }}>
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </div>
                    ))}
                  </div>
                )}
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
                disabled={!formData.customer_name || !formData.customer_number || !formData.vehicle_name || !formData.description}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: (!formData.customer_name || !formData.customer_number || !formData.vehicle_name || !formData.description) ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: (!formData.customer_name || !formData.customer_number || !formData.vehicle_name || !formData.description) ? 'not-allowed' : 'pointer'
                }}
              >
                {selectedRequirement?.editing ? 'Update' : 'Add'} Requirement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments & Attachments Modal */}
      {showCommentsModal && selectedRequirement && (
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
          padding: '2rem'
        }}
        onClick={() => setShowCommentsModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Comments & Attachments
              </h2>
              <button
                onClick={() => setShowCommentsModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X style={{ width: '1.5rem', height: '1.5rem', color: '#64748b' }} />
              </button>
            </div>

            {/* Comments Section */}
            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                  Add Comments (with optional attachments)
                </h3>
              </div>

              {/* Existing Comments */}
              {comments.length > 0 && (
                <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto', padding: '0.75rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {comments.map((comment, index) => {
                      const attachments = commentAttachmentsMap[comment.id] || []
                      return (
                        <div key={index} style={{
                          backgroundColor: '#f8fafc',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                              {comment.created_by}
                            </strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {comment.created_at ? new Date(comment.created_at).toLocaleString() : 'Just now'}
                              </span>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Delete comment"
                              >
                                <Trash2 style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} />
                              </button>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', marginBottom: attachments.length > 0 ? '0.75rem' : 0 }}>
                            {comment.comment}
                          </p>
                          {attachments.length > 0 && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                ≡ƒôÄ Attachments ({attachments.length})
                              </div>
                              {attachments.map((att, attIdx) => (
                                <a
                                  key={attIdx}
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    padding: '0.375rem 0.5rem',
                                    backgroundColor: 'white',
                                    borderRadius: '0.25rem',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '0.25rem'
                                  }}
                                >
                                  ≡ƒôä {att.file_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {comments.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', marginBottom: '1.5rem' }}>
                  No comments yet. Add one below.
                </div>
              )}

              {/* Add Comment Form */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Plus style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                    Add New Comment
                  </span>
                </div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#64748b' }}>
                  Comment text (optional)
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter your comment or leave empty to upload files only..."
                  rows={3}
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
                
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Attach Files to This Comment (Optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedCommentFiles(Array.from(e.target.files))
                      }
                    }}
                    style={{ display: 'none' }}
                    id="comment-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('comment-file-input')?.click()}
                    disabled={uploading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: 'white',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <Upload style={{ width: '1rem', height: '1rem' }} />
                    Choose Files for Comment
                    <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                      {selectedCommentFiles.length > 0 ? `${selectedCommentFiles.length} file(s)` : 'No files'}
                    </span>
                  </button>
                  {selectedCommentFiles.length > 0 && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem' }}>
                      {selectedCommentFiles.map((file, idx) => (
                        <div key={idx} style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                          ≡ƒôÄ {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() && selectedCommentFiles.length === 0}
                  style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: (!newComment.trim() && selectedCommentFiles.length === 0) ? '#94a3b8' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: (!newComment.trim() && selectedCommentFiles.length === 0) ? 'not-allowed' : 'pointer',
                    width: 'auto'
                  }}
                >
                  <Send style={{ width: '1rem', height: '1rem' }} />
                  {selectedCommentFiles.length > 0 ? `Add Comment with ${selectedCommentFiles.length} File(s)` : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

