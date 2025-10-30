'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Paperclip, X, Send, Download, Image as ImageIcon, FileText, Edit2, Trash2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Comment {
  id: string
  comment: string
  created_by: string
  role: string
  created_at: string
  attachments_count?: number
}

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_type?: string
  file_size?: number
}

interface VehicleCommentsSectionProps {
  vehicleId: string
  userRole: string
}

export default function VehicleCommentsSection({ vehicleId, userRole }: VehicleCommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userName, setUserName] = useState('')
  const [attachmentsMap, setAttachmentsMap] = useState<{[key: string]: Attachment[]}>({})
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    loadComments()
    loadUserName()
  }, [vehicleId])

  const loadUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        setCurrentUserEmail(user.email || '')
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserName(profile.name || user.email || 'User')
        } else {
          setUserName(user.email || 'User')
        }
      }
    } catch (error) {
      console.error('Error loading user name:', error)
    }
  }

  const loadComments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vehicle_inward_comments')
        .select('*')
        .eq('vehicle_inward_id', vehicleId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
      
      // Load attachments for each comment
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        const { data: attachmentsData } = await supabase
          .from('vehicle_inward_comment_attachments')
          .select('*')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: false })
        
        const attachments: {[key: string]: Attachment[]} = {}
        attachmentsData?.forEach(att => {
          if (!attachments[att.comment_id]) {
            attachments[att.comment_id] = []
          }
          attachments[att.comment_id].push(att)
        })
        setAttachmentsMap(attachments)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles].slice(0, 5)) // Limit to 5 files
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!commentText.trim() && files.length === 0) {
      alert('Please enter a comment or attach a file')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to add comments')
        return
      }

      // Create comment
      const { data: comment, error: commentError } = await supabase
        .from('vehicle_inward_comments')
        .insert({
          vehicle_inward_id: vehicleId,
          comment: commentText.trim() || '(No comment - file attachment only)',
          created_by: userName || user.email || user.id,
          role: userRole
        })
        .select()
        .single()

      if (commentError) throw commentError

      // Upload attachments if any
      if (files.length > 0 && comment) {
        const uploadedAttachments = []
        
        for (const file of files) {
          try {
            // Convert file to base64 for storage (simpler approach)
            const reader = new FileReader()
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(file)
            })

            const base64Data = await base64Promise

            // Save attachment record with base64 data URL
            // In production, you'd upload to Supabase Storage and save the URL
            const { error: attachmentError } = await supabase
              .from('vehicle_inward_comment_attachments')
              .insert({
                comment_id: comment.id,
                file_name: file.name,
                file_url: base64Data, // Store as data URL for now
                file_type: file.type,
                file_size: file.size
              })

            if (!attachmentError) {
              uploadedAttachments.push({ file_name: file.name, file_url: base64Data })
            }
          } catch (fileError) {
            console.error('Error uploading file:', fileError)
          }
        }

        // Update attachments count
        if (uploadedAttachments.length > 0) {
          await supabase
            .from('vehicle_inward_comments')
            .update({ attachments_count: uploadedAttachments.length })
            .eq('id', comment.id)
        }
      }

      // Refresh comments
      setCommentText('')
      setFiles([])
      await loadComments()
      alert('Comment added successfully!')
    } catch (error: any) {
      console.error('Error submitting comment:', error)
      alert(`Failed to add comment: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.comment)
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!editCommentText.trim()) {
      alert('Comment cannot be empty')
      return
    }

    try {
      const { error } = await supabase
        .from('vehicle_inward_comments')
        .update({ comment: editCommentText.trim() })
        .eq('id', commentId)

      if (error) throw error

      setEditingCommentId(null)
      setEditCommentText('')
      await loadComments()
      alert('Comment updated successfully!')
    } catch (error: any) {
      console.error('Error updating comment:', error)
      alert(`Failed to update comment: ${error.message}`)
    }
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditCommentText('')
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment? This will also delete all attachments.')) {
      return
    }

    try {
      // Delete comment (attachments will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from('vehicle_inward_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      await loadComments()
      alert('Comment deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting comment:', error)
      alert(`Failed to delete comment: ${error.message}`)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('vehicle_inward_comment_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) throw error

      // Update attachments count
      const remainingCount = (attachmentsMap[commentId]?.length || 1) - 1
      await supabase
        .from('vehicle_inward_comments')
        .update({ attachments_count: remainingCount })
        .eq('id', commentId)

      await loadComments()
      alert('Attachment deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting attachment:', error)
      alert(`Failed to delete attachment: ${error.message}`)
    }
  }

  const canModifyComment = (comment: Comment): boolean => {
    // Users can edit/delete their own comments (check by ID, email, or name)
    // Admins and managers can delete any comment
    if (userRole === 'admin' || userRole === 'manager') {
      return true
    }
    
    // Check if the comment was created by the current user
    const isOwnComment = 
      comment.created_by === currentUserId || 
      comment.created_by === currentUserEmail ||
      comment.created_by === userName
    
    return isOwnComment
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MessageSquare style={{ width: '1.25rem', height: '1.25rem' }} />
        Comments & Attachments
      </h3>

      {/* Add Comment Form */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db'
            e.target.style.boxShadow = 'none'
          }}
        />

        {/* File Attachments */}
        <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151'
          }}>
            <Paperclip style={{ width: '1rem', height: '1rem' }} />
            Attach Files
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx"
            />
          </label>
          
          {files.length > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #dbeafe',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem'
                  }}
                >
                  <Paperclip style={{ width: '0.875rem', height: '0.875rem', color: '#2563eb' }} />
                  <span style={{ color: '#1e40af', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    style={{
                      padding: '0.125rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || (!commentText.trim() && files.length === 0)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: submitting || (!commentText.trim() && files.length === 0) ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: submitting || (!commentText.trim() && files.length === 0) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!submitting && (commentText.trim() || files.length > 0)) {
              e.currentTarget.style.backgroundColor = '#1d4ed8'
            }
          }}
          onMouseLeave={(e) => {
            if (!submitting && (commentText.trim() || files.length > 0)) {
              e.currentTarget.style.backgroundColor = '#2563eb'
            }
          }}
        >
          <Send style={{ width: '1rem', height: '1rem' }} />
          {submitting ? 'Adding...' : 'Add Comment'}
        </button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          border: '1px dashed #d1d5db',
          color: '#6b7280'
        }}>
          No comments yet. Be the first to add one!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#111827' }}>
                    {comment.created_by}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {comment.role.charAt(0).toUpperCase() + comment.role.slice(1)} • {formatDate(comment.created_at)}
                  </div>
                </div>
                {canModifyComment(comment) && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {editingCommentId === comment.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          <Save style={{ width: '0.875rem', height: '0.875rem' }} />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          <X style={{ width: '0.875rem', height: '0.875rem' }} />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditComment(comment)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <textarea
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.75rem',
                    border: '1px solid #3b82f6',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    marginBottom: '0.75rem'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: '1.6',
                  marginBottom: (comment.attachments_count && comment.attachments_count > 0) || (attachmentsMap[comment.id] && attachmentsMap[comment.id].length > 0) ? '0.75rem' : '0'
                }}>
                  {comment.comment}
                </div>
              )}
              {attachmentsMap[comment.id] && attachmentsMap[comment.id].length > 0 && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    📎 Attachments ({attachmentsMap[comment.id].length})
                  </div>
                  {attachmentsMap[comment.id].map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'white',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb',
                        textDecoration: 'none',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff'
                        e.currentTarget.style.borderColor = '#3b82f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                      }}
                    >
                      {attachment.file_type?.startsWith('image/') ? (
                        <ImageIcon style={{ width: '1rem', height: '1rem' }} />
                      ) : (
                        <FileText style={{ width: '1rem', height: '1rem' }} />
                      )}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {attachment.file_name}
                      </span>
                      {attachment.file_size && (
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      <Download style={{ width: '0.875rem', height: '0.875rem' }} />
                      {canModifyComment(comment) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteAttachment(attachment.id, comment.id)
                          }}
                          style={{
                            padding: '0.25rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            marginLeft: '0.5rem'
                          }}
                        >
                          <Trash2 style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} />
                        </button>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

