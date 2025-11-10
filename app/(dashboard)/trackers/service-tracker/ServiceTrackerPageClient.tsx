'use client'

import { useState, useEffect } from 'react'
import { Car, Search, Eye, MessageSquare, Calendar, CheckCircle, AlertCircle, Plus, Edit, Trash2, X, Upload, Send, ChevronLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

export default function ServiceTrackerPageClient() {
  const [services, setServices] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingService, setEditingService] = useState<any>(null)
  const [serviceAttachments, setServiceAttachments] = useState<any[]>([]) // Attachments from initial service creation
  const [commentAttachments, setCommentAttachments] = useState<any[]>([]) // Attachments for the comment being added
  const [commentAttachmentsMap, setCommentAttachmentsMap] = useState<{[key: string]: any[]}>({}) // Map of comment_id -> attachments
  const [uploading, setUploading] = useState(false)
  const [uploadingCommentAttachment, setUploadingCommentAttachment] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedCommentFiles, setSelectedCommentFiles] = useState<File[]>([])
  const router = useRouter()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    modal_name: '',
    registration_number: '',
    customer_name: '',
    customer_number: '',
    service_description: '',
    status: 'new_complaint',
    scheduled_date: new Date().toISOString().slice(0, 16)
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase
        .from('service_tracker')
        .select('*')
        .order('scheduled_date', { ascending: false })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) {
        // Check if error is due to missing tenant_id column (PostgreSQL error code 42703 = undefined_column)
        if (error.code === '42703' && error.message?.includes('tenant_id')) {
          console.error('Γ¥î ERROR: tenant_id column is missing in service_tracker table.')
          console.error('≡ƒôï SOLUTION: Please run this SQL migration in Supabase SQL Editor:')
          console.error('   File: database/add_tenant_id_to_service_tracker.sql')
          console.error('   This will add the tenant_id column and enable multi-tenant data isolation.')
          alert('Database migration required: Please run database/add_tenant_id_to_service_tracker.sql in Supabase SQL Editor to add tenant_id column to service_tracker table.')
        } else {
          // More detailed error logging for other errors
          console.error('Error fetching services:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }
        setServices([])
        return
      }

      setServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices([])
    }
  }

  const fetchComments = async (serviceId: string) => {
    try {
      // Fetch comments
      const { data, error } = await supabase
        .from('service_tracker_comments')
        .select('*')
        .eq('service_tracker_id', serviceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
      
      // Fetch attachments for each comment
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        const { data: attachmentsData } = await supabase
          .from('service_tracker_comment_attachments')
          .select('*')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: false })
        
        // Create a map of comment_id -> attachments
        const attachmentsMap: {[key: string]: any[]} = {}
        attachmentsData?.forEach(att => {
          if (!attachmentsMap[att.comment_id]) {
            attachmentsMap[att.comment_id] = []
          }
          attachmentsMap[att.comment_id].push(att)
        })
        setCommentAttachmentsMap(attachmentsMap)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([])
    }
  }

  const fetchAttachments = async (serviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_tracker_attachments')
        .select('*')
        .eq('service_tracker_id', serviceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setServiceAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
      setServiceAttachments([])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      let serviceId: string
      
      if (editingService) {
        // Update existing service
        const tenantId = getCurrentTenantId()
        const isSuper = isSuperAdmin()
        
        let updateQuery = supabase
          .from('service_tracker')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingService.id)
        
        // Add tenant filter for security
        if (!isSuper && tenantId) {
          updateQuery = updateQuery.eq('tenant_id', tenantId)
        }
        
        const { error, data } = await updateQuery.select('id').single()

        if (error) throw error
        serviceId = data.id
        alert('Service updated successfully!')
      } else {
        // Create new service
        const tenantId = getCurrentTenantId()
        const { error, data } = await supabase
          .from('service_tracker')
          .insert({
            ...formData,
            tenant_id: tenantId // Add tenant_id for data isolation
          })
          .select('id')
          .single()

        if (error) throw error
        serviceId = data.id
        alert('Service added successfully!')
      }

      // Upload files if any were selected
      if (selectedFiles.length > 0) {
        await handleFileUpload(serviceId)
      }

      setShowAddModal(false)
      setEditingService(null)
      resetForm()
      fetchServices()
    } catch (error: any) {
      console.error('Error saving service:', error)
      alert(`Failed to save: ${error.message}`)
    }
  }

  const handleEdit = (service: any) => {
    setEditingService(service)
    setFormData({
      modal_name: service.modal_name || '',
      registration_number: service.registration_number || '',
      customer_name: service.customer_name || '',
      customer_number: service.customer_number || '',
      service_description: service.service_description || '',
      status: service.status || 'new_complaint',
      scheduled_date: service.scheduled_date ? new Date(service.scheduled_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service job?')) return

    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let deleteQuery = supabase
        .from('service_tracker')
        .delete()
        .eq('id', id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await deleteQuery

      if (error) throw error
      alert('Service deleted successfully!')
      fetchServices()
    } catch (error: any) {
      console.error('Error deleting service:', error)
      alert(`Failed to delete: ${error.message}`)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('service_tracker')
        .update({ status: newStatus })
        .eq('id', id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery

      if (error) throw error
      fetchServices()
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert(`Failed to update status: ${error.message}`)
    }
  }

  const handleOpenComments = async (service: any) => {
    setSelectedService(service)
    setComments([])
    setServiceAttachments([])
    setCommentAttachmentsMap({})
    setNewComment('')
    setSelectedCommentFiles([])
    setShowCommentsModal(true)
    await fetchComments(service.id)
    await fetchAttachments(service.id)
  }

  const handleFileUpload = async (serviceId: string) => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload')
      return
    }

    setUploading(true)
    try {
      let uploadCount = 0
      
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${uploadCount}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `${serviceId}/${fileName}`

        console.log('Uploading file:', file.name, 'to:', filePath)

        // Upload to Supabase Storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('service-attachments')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        // Get public URL
        const { data: urlData } = await supabase.storage
          .from('service-attachments')
          .getPublicUrl(filePath)

        console.log('File uploaded, public URL:', urlData.publicUrl)

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('service_tracker_attachments')
          .insert({
            service_tracker_id: serviceId,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size
          })

        if (dbError) {
          console.error('Database error:', dbError)
          throw dbError
        }

        uploadCount++
      }
      
      // Update attachments count to actual total
      const { data: allAttachments } = await supabase
        .from('service_tracker_attachments')
        .select('id')
        .eq('service_tracker_id', serviceId)
      
      await supabase
        .from('service_tracker')
        .update({ attachments_count: allAttachments?.length || 0 })
        .eq('id', serviceId)

      setSelectedFiles([])
      alert(`${uploadCount} file(s) uploaded successfully!`)
      fetchAttachments(serviceId)
      fetchServices()
    } catch (error: any) {
      console.error('Error uploading files:', error)
      alert(`Failed to upload files: ${error.message || error}`)
    } finally {
      setUploading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() && selectedCommentFiles.length === 0) return

    try {
      // Insert comment
      const { data: commentData, error: commentError } = await supabase
        .from('service_tracker_comments')
        .insert({
          service_tracker_id: selectedService.id,
          comment: newComment.trim() || '(No comment text)',
          created_by: 'Demo Admin',
          attachments_count: selectedCommentFiles.length
        })
        .select('id')
        .single()

      if (commentError) throw commentError

      // Upload comment attachments if any
      if (selectedCommentFiles.length > 0) {
        for (const file of selectedCommentFiles) {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const filePath = `${selectedService.id}/comments/${commentData.id}/${fileName}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('service-attachments')
            .upload(filePath, file)

          if (uploadError) throw uploadError

          // Get public URL
          const { data: urlData } = await supabase.storage
            .from('service-attachments')
            .getPublicUrl(filePath)

          // Save comment attachment metadata
          await supabase
            .from('service_tracker_comment_attachments')
            .insert({
              comment_id: commentData.id,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type,
              file_size: file.size
            })
        }
      }

      // Update comments count
      await supabase
        .from('service_tracker')
        .update({ comments_count: comments.length + 1 })
        .eq('id', selectedService.id)

      setNewComment('')
      setSelectedCommentFiles([])
      fetchComments(selectedService.id)
      fetchServices()
    } catch (error: any) {
      console.error('Error adding comment:', error)
      alert(`Failed to add comment: ${error.message}`)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      const { error } = await supabase
        .from('service_tracker_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      // Update comments count
      await supabase
        .from('service_tracker')
        .update({ comments_count: Math.max(0, comments.length - 1) })
        .eq('id', selectedService.id)

      fetchComments(selectedService.id)
      fetchServices()
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      alert(`Failed to delete comment: ${error.message}`)
    }
  }

  const handleDeleteCommentAttachment = async (attachmentId: string, commentId: string) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const { error } = await supabase
        .from('service_tracker_comment_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) throw error

      // Refresh comments to update the display
      await fetchComments(selectedService.id)
    } catch (error: any) {
      console.error('Error deleting attachment:', error)
      alert(`Failed to delete attachment: ${error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      modal_name: '',
      registration_number: '',
      customer_name: '',
      customer_number: '',
      service_description: '',
      status: 'new_complaint',
      scheduled_date: new Date().toISOString().slice(0, 16)
    })
    setEditingService(null)
    setSelectedFiles([])
  }

  // Calculate KPIs
  const newComplaint = services.filter(s => s.status === 'new_complaint').length
  const underInspection = services.filter(s => s.status === 'under_inspection').length
  const sentToService = services.filter(s => s.status === 'sent_to_service_centre').length
  const received = services.filter(s => s.status === 'received').length
  const completed = services.filter(s => s.status === 'completed').length

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.modal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          service.registration_number?.includes(searchTerm) ||
                          service.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          service.service_description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'All' || service.status === statusFilter.toLowerCase().replace(' ', '_')
    return matchesSearch && matchesStatus
  })

  const statusOptions = [
    { value: 'new_complaint', label: 'New Complaint' },
    { value: 'under_inspection', label: 'Under Inspection' },
    { value: 'sent_to_service_centre', label: 'Sent to Service Centre' },
    { value: 'received', label: 'Received' },
    { value: 'completed', label: 'Completed' }
  ]

  const statusColors: Record<string, { bg: string; icon: string }> = {
    new_complaint: { bg: '#fee2e2', icon: '#dc2626' },
    under_inspection: { bg: '#fef3c7', icon: '#f59e0b' },
    sent_to_service_centre: { bg: '#dbeafe', icon: '#2563eb' },
    received: { bg: '#f3e8ff', icon: '#7c3aed' },
    completed: { bg: '#dcfce7', icon: '#059669' }
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
              Service Tracker
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
              Track vehicle service jobs and manage service products
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
            Add Service Job
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setStatusFilter('New Complaint')}
          style={{ 
            backgroundColor: statusFilter === 'New Complaint' ? '#fee2e2' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'New Complaint' ? '2px solid #dc2626' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle style={{ width: '1.5rem', height: '1.5rem', color: '#dc2626' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{newComplaint}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>New Complaint</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('Under Inspection')}
          style={{ 
            backgroundColor: statusFilter === 'Under Inspection' ? '#fef3c7' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Under Inspection' ? '2px solid #f59e0b' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search style={{ width: '1.5rem', height: '1.5rem', color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{underInspection}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Under Inspection</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('Sent to Service Centre')}
          style={{ 
            backgroundColor: statusFilter === 'Sent to Service Centre' ? '#dbeafe' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Sent to Service Centre' ? '2px solid #2563eb' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{sentToService}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Sent to Service C...</div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setStatusFilter('Received')}
          style={{ 
            backgroundColor: statusFilter === 'Received' ? '#f3e8ff' : 'white',
            padding: '1.5rem', 
            borderRadius: '0.5rem', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: statusFilter === 'Received' ? '2px solid #7c3aed' : 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar style={{ width: '1.5rem', height: '1.5rem', color: '#7c3aed' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{received}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Received</div>
            </div>
          </div>
        </button>

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
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{completed}</div>
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
              placeholder="Search service jobs..."
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
            {statusOptions.map(status => (
              <option key={status.value} value={status.label}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Service Jobs Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Active Service Jobs</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8fafc' }}>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>VEHICLE DETAILS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>CUSTOMER DETAILS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>SERVICE DETAILS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>SCHEDULED DATE</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ATTACHMENTS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>COMMENTS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No service jobs found. Add your first service job!
                </td>
              </tr>
            ) : (
              filteredServices.map((service, index) => (
                <tr key={service.id} style={{ borderBottom: index === filteredServices.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '0.25rem' }}>{service.modal_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{service.registration_number}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '0.25rem' }}>{service.customer_name}</div>
                    <a href={`tel:${service.customer_number}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.75rem' }}>
                      {service.customer_number}
                    </a>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>{service.service_description}</td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                    <div>{new Date(service.scheduled_date).toLocaleDateString('en-GB')}</div>
                    <div style={{ fontSize: '0.75rem' }}>{new Date(service.scheduled_date).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenComments(service)}
                      className="hover:bg-blue-50 hover:rounded hover:px-2 hover:py-1 transition-colors"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#2563eb',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem'
                      }}
                      title={`View ${service.attachments_count || 0} attachment(s)`}
                    >
                      <Upload style={{ width: '1rem', height: '1rem' }} />
                      <span style={{ fontWeight: '500' }}>{service.attachments_count || 0}</span>
                    </button>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
                    <button
                      onClick={() => handleOpenComments(service)}
                      className="hover:bg-blue-50 hover:rounded hover:px-2 hover:py-1 transition-colors"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#2563eb',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem'
                      }}
                      title={`View ${service.comments_count || 0} comment(s)`}
                    >
                      <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                      <span style={{ fontWeight: '500' }}>
                        {service.comments_count || 0} {service.comments_count === 0 ? 'No comments' : ''}
                      </span>
                    </button>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <select
                      value={service.status}
                      onChange={(e) => handleStatusUpdate(service.id, e.target.value)}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        minWidth: '150px'
                      }}
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(service)}
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
                        onClick={() => handleDelete(service.id)}
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
                        <Trash2 style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Service Modal */}
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
                {editingService ? 'Edit' : 'Add New'} Service Job
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
                    Modal Name *
                  </label>
                  <input
                    type="text"
                    value={formData.modal_name}
                    onChange={(e) => handleInputChange('modal_name', e.target.value)}
                    placeholder="Enter vehicle modal name"
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
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    placeholder="Enter registration number"
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
                  Description *
                </label>
                <textarea
                  value={formData.service_description}
                  onChange={(e) => handleInputChange('service_description', e.target.value)}
                  placeholder="Enter service description"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    Scheduled Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
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
                  id="add-service-file-input"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('add-service-file-input')?.click()}
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
                  <div style={{ marginTop: '0.75rem' }}>
                    {selectedFiles.map((file, index) => (
                      <div key={index} style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        padding: '0.5rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '0.375rem',
                        marginBottom: '0.25rem'
                      }}>
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
                disabled={!formData.modal_name || !formData.registration_number || !formData.customer_name || !formData.customer_number || !formData.service_description}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: (!formData.modal_name || !formData.registration_number || !formData.customer_name || !formData.customer_number || !formData.service_description) ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: (!formData.modal_name || !formData.registration_number || !formData.customer_name || !formData.customer_number || !formData.service_description) ? 'not-allowed' : 'pointer'
                }}
              >
                {editingService ? 'Update' : 'Add'} Service Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments & Attachments Modal */}
      {showCommentsModal && selectedService && (
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
        onClick={() => setShowCommentsModal(false)}
        >
          <div
            style={{
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

            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                <strong>Vehicle:</strong> {selectedService.modal_name} ({selectedService.registration_number})
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                <strong>Customer:</strong> {selectedService.customer_name}
              </div>
            </div>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MessageSquare style={{ width: '1.5rem', height: '1.5rem', color: '#2563eb' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                  Add Comments (with optional attachments)
                </h3>
              </div>
              {/* Existing Comments */}
              {comments.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <MessageSquare style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', margin: 0 }}>
                      Existing Comments ({comments.length})
                    </h4>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.75rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
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
                          {/* Show comment attachments if any */}
                          {attachments.length > 0 && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                ≡ƒôÄ Attachments ({attachments.length})
                              </div>
                              {attachments.map((att, attIdx) => (
                                <div key={attIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                  <a
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      flex: 1,
                                      fontSize: '0.75rem',
                                      color: '#2563eb',
                                      textDecoration: 'none',
                                      padding: '0.375rem 0.5rem',
                                      backgroundColor: 'white',
                                      borderRadius: '0.25rem',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    ≡ƒôä {att.file_name} ({att.file_size ? `${(att.file_size / 1024).toFixed(2)} KB` : ''})
                                  </a>
                                  <button
                                    onClick={() => handleDeleteCommentAttachment(att.id, comment.id)}
                                    style={{
                                      backgroundColor: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '0.25rem',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Delete attachment"
                                  >
                                    <X style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              )}

              {/* Divider if there are existing comments */}
              {comments.length > 0 && (
                <div style={{ marginBottom: '1rem', borderBottom: '1px dashed #e2e8f0' }} />
              )}

              {/* No comments yet message */}
              {comments.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', marginBottom: '1.5rem' }}>
                  No comments yet. Add one below.
                </div>
              )}

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
                
                {/* File upload for comment attachments */}
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
                    disabled={uploadingCommentAttachment}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      backgroundColor: uploadingCommentAttachment ? '#f1f5f9' : 'white',
                      color: uploadingCommentAttachment ? '#94a3b8' : '#64748b',
                      cursor: uploadingCommentAttachment ? 'not-allowed' : 'pointer',
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

            
            {/* Visual Divider */}
            <div style={{ margin: '2rem 0', borderBottom: '2px solid #e2e8f0' }} />

            <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Upload style={{ width: '1.5rem', height: '1.5rem', color: '#64748b' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                  Service Files ({serviceAttachments.length})
                </h3>
              </div>
              
              {/* Show existing attachments */}
              {serviceAttachments.length > 0 ? (
                <div style={{ marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem' }}>
                  {serviceAttachments.map((attachment, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: 'white',
                      borderRadius: '0.375rem',
                      marginBottom: '0.5rem',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <FileText style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                        <a 
                          href={attachment.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            fontSize: '0.875rem', 
                            color: '#2563eb', 
                            textDecoration: 'none',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={attachment.file_name}
                        >
                          {attachment.file_name}
                        </a>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                        {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(2)} KB` : 'Unknown size'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#94a3b8', 
                  padding: '2rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px dashed #cbd5e1'
                }}>
                  No service attachments from initial creation.
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

