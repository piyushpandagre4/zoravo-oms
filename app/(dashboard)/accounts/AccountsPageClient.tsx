'use client'

import { useState, useEffect } from 'react'
import { DollarSign, FileText, TrendingUp, Eye, Download, Search, Calendar, User, Car, Package, MapPin, Building, AlertCircle, CheckCircle, Clock, Edit2, Save, X, Upload, Link as LinkIcon, FileImage, BarChart3, Filter, Percent, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VehicleCommentsSection from '@/components/VehicleCommentsSection'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

interface AccountEntry {
  id: string
  shortId?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  vehicleNumber: string
  model: string
  make: string
  year?: number
  color?: string
  vehicleType?: string
  location?: string
  manager?: string
  installationCompleteDate: string
  expectedDelivery?: string
  products: ProductDetail[]
  totalAmount: number
  status: string
  created_at: string
  completed_at?: string
  discountAmount?: number
  discountPercentage?: number
  discountOfferedBy?: string
  discountReason?: string
  finalAmount?: number
  invoiceNumber?: string // Invoice number from external platform
}

interface ProductDetail {
  product: string
  brand: string
  price: number
  department: string
}

interface InvoiceReference {
  type: 'link' | 'file' | 'image'
  url: string
  fileName?: string
  uploadedAt?: string
}

export default function AccountsPageClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('entries')
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [completedEntries, setCompletedEntries] = useState<AccountEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [completedLoading, setCompletedLoading] = useState(false)
  const [timeFilter, setTimeFilter] = useState<string>('all') // 'all', 'today', 'week', 'month', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [locationNames, setLocationNames] = useState<Map<string, string>>(new Map())
  const [vehicleTypeNames, setVehicleTypeNames] = useState<Map<string, string>>(new Map())
  const [managerNames, setManagerNames] = useState<Map<string, string>>(new Map())
  const [departmentNames, setDepartmentNames] = useState<Map<string, string>>(new Map())
  const [selectedEntry, setSelectedEntry] = useState<AccountEntry | null>(null)
  const [editingProducts, setEditingProducts] = useState(false)
  const [editedProducts, setEditedProducts] = useState<ProductDetail[]>([])
  const [savingProducts, setSavingProducts] = useState(false)
  const [invoiceLink, setInvoiceLink] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [invoiceReferences, setInvoiceReferences] = useState<InvoiceReference[]>([])
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [userRole, setUserRole] = useState('accountant')
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [discountAmount, setDiscountAmount] = useState<string>('')
  const [discountOfferedBy, setDiscountOfferedBy] = useState<string>('')
  const [discountReason, setDiscountReason] = useState<string>('')
  const [savingDiscount, setSavingDiscount] = useState(false)
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState(false)
  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('')
  const [updatingInvoiceNumber, setUpdatingInvoiceNumber] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadRelatedData()
    fetchAccountEntries()
    loadUserRole()
    if (activeTab === 'completed') {
      fetchCompletedEntries()
    }
  }, [activeTab, timeFilter, customStartDate, customEndDate])

  useEffect(() => {
    if (selectedEntry) {
      setEditedProducts([...selectedEntry.products])
      loadInvoiceReferences()
      // Load discount data for completed entries
      if (selectedEntry.status === 'completed') {
        setDiscountAmount(selectedEntry.discountAmount?.toString() || '')
        setDiscountOfferedBy(selectedEntry.discountOfferedBy || '')
        setDiscountReason(selectedEntry.discountReason || '')
      }
      // Load invoice number for editing
      setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
      setEditingInvoiceNumber(false)
    }
  }, [selectedEntry])

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) {
          setUserRole(profile.role || 'accountant')
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }

  const loadInvoiceReferences = async () => {
    if (!selectedEntry) return
    try {
      // Load invoice references from comments with invoice tag or from a dedicated field
      // For now, we'll store invoice references as comments with a special format
      const { data: comments } = await supabase
        .from('vehicle_inward_comments')
        .select('*')
        .eq('vehicle_inward_id', selectedEntry.id)
        .like('comment', 'INVOICE_REF:%')
        .order('created_at', { ascending: false})
      
      if (comments && comments.length > 0) {
        // Get attachment IDs for these comments
        const commentIds = comments.map(c => c.id)
        const { data: attachments } = await supabase
          .from('vehicle_inward_comment_attachments')
          .select('*')
          .in('comment_id', commentIds)
        
        const attachmentsMap: {[key: string]: any} = {}
        if (attachments) {
          attachments.forEach(att => {
            attachmentsMap[att.comment_id] = att
          })
        }
        
        const refs: InvoiceReference[] = comments.map(c => {
          const match = c.comment.match(/INVOICE_REF:(link|file|image):(.+)/)
          if (match) {
            const attachment = attachmentsMap[c.id]
            return {
              type: match[1] as 'link' | 'file' | 'image',
              url: attachment ? attachment.file_url : match[2],
              fileName: attachment ? attachment.file_name : match[2],
              uploadedAt: c.created_at
            }
          }
          return null
        }).filter(Boolean) as InvoiceReference[]
        setInvoiceReferences(refs)
      } else {
        setInvoiceReferences([])
      }
    } catch (error) {
      console.error('Error loading invoice references:', error)
      setInvoiceReferences([])
    }
  }

  const loadRelatedData = async () => {
    try {
      // Fetch locations
      const { data: locations } = await supabase.from('locations').select('id, name')
      if (locations) {
        setLocationNames(new Map(locations.map(loc => [loc.id, loc.name])))
      }

      // Fetch vehicle types
      const { data: vehicleTypes } = await supabase.from('vehicle_types').select('id, name')
      if (vehicleTypes) {
        setVehicleTypeNames(new Map(vehicleTypes.map(vt => [vt.id, vt.name])))
      }

      // Fetch managers
      const { data: managers } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'manager')
      if (managers) {
        setManagerNames(new Map(managers.map(mgr => [mgr.id, mgr.name])))
      }

      // Fetch departments
      const { data: departments } = await supabase.from('departments').select('id, name')
      if (departments) {
        setDepartmentNames(new Map(departments.map(dept => [dept.id, dept.name])))
      }
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const fetchCompletedEntries = async () => {
    try {
      setCompletedLoading(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // Fetch vehicles that are finished from operations perspective and should remain in Accounts history
      // Includes: completed, complete_and_delivered, delivered variants
      let query = supabase
        .from('vehicle_inward')
        .select('*')
        .in('status', ['completed', 'complete_and_delivered', 'delivered', 'delivered_final', 'delivered (final)'])
        .order('updated_at', { ascending: false })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      // Apply time filter
      let startDate: Date | null = null
      const now = new Date()
      
      switch (timeFilter) {
        case 'today': {
          const today = new Date(now)
          today.setHours(0, 0, 0, 0)
          startDate = today
          break
        }
        case 'week': {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          startDate = weekAgo
          break
        }
        case 'month': {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          startDate = monthAgo
          break
        }
        case 'year': {
          const yearAgo = new Date(now)
          yearAgo.setFullYear(yearAgo.getFullYear() - 1)
          startDate = yearAgo
          break
        }
        case 'custom':
          if (customStartDate) {
            startDate = new Date(customStartDate)
          }
          break
      }

      if (startDate) {
        query = query.gte('updated_at', startDate.toISOString())
      }

      if (timeFilter === 'custom' && customEndDate) {
        const endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('updated_at', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        const mappedEntries: AccountEntry[] = data.map((v: any) => {
          // Parse products from accessories_requested JSON
          let products: ProductDetail[] = []
          let totalAmount = 0

          if (v.accessories_requested) {
            try {
              const parsed = JSON.parse(v.accessories_requested)
              if (Array.isArray(parsed)) {
                products = parsed.map((p: any) => {
                  const price = parseFloat(p.price || 0)
                  totalAmount += price
                  return {
                    product: p.product || '',
                    brand: p.brand || '',
                    price: price,
                    department: p.department || ''
                  }
                })
              }
            } catch {
              // If parsing fails, keep empty products
            }
          }

          // Get discount data and invoice number from notes field (stored as JSON)
          let discountAmount = 0
          let discountPercentage = 0
          let discountOfferedBy = ''
          let discountReason = ''
          let invoiceNumber = ''
          
          if (v.notes) {
            try {
              const notesData = JSON.parse(v.notes)
              if (notesData.discount) {
                discountAmount = parseFloat(notesData.discount.discount_amount || 0)
                discountPercentage = notesData.discount.discount_percentage || (totalAmount > 0 ? (discountAmount / totalAmount) * 100 : 0)
                discountOfferedBy = notesData.discount.discount_offered_by || ''
                discountReason = notesData.discount.discount_reason || ''
              }
              // Get invoice number from notes
              if (notesData.invoice_number) {
                invoiceNumber = notesData.invoice_number
              }
            } catch {
              // If parsing fails, check if there's a direct discount_amount column
              discountAmount = parseFloat(v.discount_amount || 0)
              if (discountAmount > 0 && totalAmount > 0) {
                discountPercentage = (discountAmount / totalAmount) * 100
              }
            }
          } else {
            // Fallback to direct column if exists
            discountAmount = parseFloat(v.discount_amount || 0)
            if (discountAmount > 0 && totalAmount > 0) {
              discountPercentage = (discountAmount / totalAmount) * 100
            }
            discountOfferedBy = v.discount_offered_by || v.discount_offered_by_name || ''
            discountReason = v.discount_reason || ''
          }
          
          const finalAmount = totalAmount - discountAmount

          return {
            id: v.id,
            shortId: v.short_id || v.id.substring(0, 8),
            customerName: v.customer_name || 'N/A',
            customerPhone: v.customer_phone || 'N/A',
            customerEmail: v.customer_email,
            vehicleNumber: v.registration_number || 'N/A',
            model: v.model || 'N/A',
            make: v.make || 'Unknown',
            year: v.year,
            color: v.color,
            vehicleType: v.vehicle_type,
            location: v.location_id,
            manager: v.assigned_manager_id,
            installationCompleteDate: v.updated_at || v.created_at,
            expectedDelivery: v.estimated_completion_date,
            products: products,
            totalAmount: totalAmount,
            status: v.status,
            created_at: v.created_at,
            completed_at: v.updated_at,
            discountAmount: discountAmount,
            discountPercentage: discountPercentage,
            discountOfferedBy: discountOfferedBy,
            discountReason: discountReason,
            finalAmount: finalAmount,
            invoiceNumber: invoiceNumber
          }
        })

        setCompletedEntries(mappedEntries)
      } else {
        setCompletedEntries([])
      }
    } catch (error) {
      console.error('Error fetching completed entries:', error)
      setCompletedEntries([])
    } finally {
      setCompletedLoading(false)
    }
  }

  const fetchAccountEntries = async () => {
    try {
      setLoading(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // Fetch only vehicles with "installation_complete" status (pending accountant work)
      // Once marked as "completed", they are removed from the main Accounts view
      let query = supabase
        .from('vehicle_inward')
        .select('*')
        .eq('status', 'installation_complete')
        .order('updated_at', { ascending: false })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query

      if (error) throw error

      if (data && data.length > 0) {
        const mappedEntries: AccountEntry[] = data.map((v: any) => {
          // Parse products from accessories_requested JSON
          let products: ProductDetail[] = []
          let totalAmount = 0

          if (v.accessories_requested) {
            try {
              const parsed = JSON.parse(v.accessories_requested)
              if (Array.isArray(parsed)) {
                products = parsed.map((p: any) => {
                  const price = parseFloat(p.price || 0)
                  totalAmount += price
                  return {
                    product: p.product || '',
                    brand: p.brand || '',
                    price: price,
                    department: p.department || ''
                  }
                })
              }
            } catch {
              // If parsing fails, keep empty products
            }
          }

          // Get invoice number from notes field
          let invoiceNumber = ''
          if (v.notes) {
            try {
              const notesData = JSON.parse(v.notes)
              if (notesData.invoice_number) {
                invoiceNumber = notesData.invoice_number
              }
            } catch {
              // If parsing fails, invoice number remains empty
            }
          }

          return {
            id: v.id,
            shortId: v.short_id || v.id.substring(0, 8),
            customerName: v.customer_name || 'N/A',
            customerPhone: v.customer_phone || 'N/A',
            customerEmail: v.customer_email,
            vehicleNumber: v.registration_number || 'N/A',
            model: v.model || 'N/A',
            make: v.make || 'Unknown',
            year: v.year,
            color: v.color,
            vehicleType: v.vehicle_type,
            location: v.location_id,
            manager: v.assigned_manager_id,
            installationCompleteDate: v.updated_at || v.created_at,
            expectedDelivery: v.estimated_completion_date,
            products: products,
            totalAmount: totalAmount,
            status: v.status,
            created_at: v.created_at,
            invoiceNumber: invoiceNumber
          }
        })

        setEntries(mappedEntries)
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error('Error fetching account entries:', error)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary statistics for entries
  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase()
    return (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
      entry.model.toLowerCase().includes(searchLower) ||
      entry.shortId?.toLowerCase().includes(searchLower)
    )
  })

  const totalEntries = filteredEntries.length
  const totalRevenue = filteredEntries.reduce((sum, entry) => sum + entry.totalAmount, 0)
  const avgOrderValue = totalEntries > 0 ? totalRevenue / totalEntries : 0

  // Calculate analytics for completed entries
  const filteredCompleted = completedEntries.filter(entry => {
    const searchLower = searchTerm.toLowerCase()
    return (
      entry.customerName.toLowerCase().includes(searchLower) ||
      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
      entry.model.toLowerCase().includes(searchLower) ||
      entry.shortId?.toLowerCase().includes(searchLower)
    )
  })

  const completedTotal = filteredCompleted.length
  const completedRevenue = filteredCompleted.reduce((sum, entry) => sum + (entry.finalAmount || entry.totalAmount), 0)
  const completedOriginalRevenue = filteredCompleted.reduce((sum, entry) => sum + entry.totalAmount, 0)
  const totalDiscountsGiven = filteredCompleted.reduce((sum, entry) => sum + (entry.discountAmount || 0), 0)
  const avgDiscount = completedTotal > 0 ? totalDiscountsGiven / completedTotal : 0
  const avgDiscountPercentage = completedOriginalRevenue > 0 ? (totalDiscountsGiven / completedOriginalRevenue) * 100 : 0
  const avgCompletedOrderValue = completedTotal > 0 ? completedRevenue / completedTotal : 0
  const entriesWithDiscount = filteredCompleted.filter(e => (e.discountAmount || 0) > 0).length
  const discountRatio = completedTotal > 0 ? (entriesWithDiscount / completedTotal) * 100 : 0

  // Dynamic summary stats based on active tab
  const displayTotalEntries = activeTab === 'completed' ? completedTotal : totalEntries
  const displayTotalRevenue = activeTab === 'completed' ? completedRevenue : totalRevenue
  const displayAvgOrderValue = activeTab === 'completed' ? avgCompletedOrderValue : avgOrderValue

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const generateCSV = (entries: AccountEntry[]): string => {
    const headers = [
      'Entry ID',
      'Customer Name',
      'Phone',
      'Email',
      'Vehicle Number',
      'Model',
      'Make',
      'Year',
      'Color',
      'Vehicle Type',
      'Location',
      'Manager',
      'Installation Complete Date',
      'Expected Delivery',
      'Product Details',
      'Total Amount'
    ]

    const rows = entries.map(entry => {
      const productsText = entry.products.map(p => `${p.product} (${p.brand}) - ${formatCurrency(p.price)}`).join('; ')
      return [
        entry.shortId || entry.id.substring(0, 8),
        entry.customerName,
        entry.customerPhone,
        entry.customerEmail || '',
        entry.vehicleNumber,
        entry.model,
        entry.make,
        entry.year?.toString() || '',
        entry.color || '',
        entry.vehicleType ? (vehicleTypeNames.get(entry.vehicleType) || entry.vehicleType) : '',
        entry.location ? (locationNames.get(entry.location) || entry.location) : '',
        entry.manager ? (managerNames.get(entry.manager) || entry.manager) : '',
        formatDate(entry.installationCompleteDate),
        entry.expectedDelivery ? new Date(entry.expectedDelivery).toLocaleDateString('en-IN') : '',
        productsText,
        entry.totalAmount.toString()
      ]
    })

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
  }

  const generateEntryCSV = (entry: AccountEntry): string => {
    const headers = ['Product', 'Brand', 'Department', 'Price']
    const rows = entry.products.map(product => [
      product.product,
      product.brand,
      departmentNames.get(product.department) || product.department,
      product.price.toString()
    ])

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
  }

  const generateCompletedCSV = (entries: AccountEntry[]): string => {
    const headers = [
      'Entry ID',
      'Customer Name',
      'Phone',
      'Email',
      'Vehicle Number',
      'Model',
      'Make',
      'Location',
      'Manager',
      'Completed Date',
      'Original Amount',
      'Discount Amount',
      'Discount %',
      'Discount Offered By',
      'Discount Reason',
      'Final Amount',
      'Product Count'
    ]

    const rows = entries.map(entry => [
      entry.shortId || entry.id.substring(0, 8),
      entry.customerName,
      entry.customerPhone,
      entry.customerEmail || '',
      entry.vehicleNumber,
      entry.model,
      entry.make,
      entry.location ? (locationNames.get(entry.location) || entry.location) : '',
      entry.manager ? (managerNames.get(entry.manager) || entry.manager) : '',
      entry.completed_at ? formatDate(entry.completed_at) : '',
      entry.totalAmount.toString(),
      (entry.discountAmount || 0).toString(),
      (entry.discountPercentage || 0).toFixed(2),
      entry.discountOfferedBy || '',
      entry.discountReason || '',
      (entry.finalAmount || entry.totalAmount).toString(),
      entry.products.length.toString()
    ])

    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleEditProducts = () => {
    setEditingProducts(true)
    setEditedProducts([...selectedEntry!.products])
  }

  const handleCancelEdit = () => {
    setEditingProducts(false)
    if (selectedEntry) {
      setEditedProducts([...selectedEntry.products])
    }
  }

  const handleProductChange = (index: number, field: keyof ProductDetail, value: string | number) => {
    const updated = [...editedProducts]
    updated[index] = { ...updated[index], [field]: value }
    setEditedProducts(updated)
  }

  const handleSaveProducts = async () => {
    if (!selectedEntry) return
    
    try {
      setSavingProducts(true)
      // Update accessories_requested in vehicle_inward
      const updatedProducts = JSON.stringify(editedProducts)
      
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ accessories_requested: updatedProducts })
        .eq('id', selectedEntry.id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery

      if (error) throw error

      // Recalculate total
      const newTotal = editedProducts.reduce((sum, p) => sum + p.price, 0)
      
      // Update entry in state
      const updatedEntry = {
        ...selectedEntry,
        products: editedProducts,
        totalAmount: newTotal
      }
      setSelectedEntry(updatedEntry)
      
      // Update entry in entries list
      setEntries(entries.map(e => e.id === selectedEntry.id ? updatedEntry : e))
      
      setEditingProducts(false)
      alert('Product details updated successfully!')
      await fetchAccountEntries()
    } catch (error: any) {
      console.error('Error saving products:', error)
      alert(`Failed to save products: ${error.message}`)
    } finally {
      setSavingProducts(false)
    }
  }

  const handleAddInvoiceLink = async () => {
    if (!invoiceLink.trim() || !selectedEntry) return
    
    try {
      setInvoiceLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      // Create a comment as invoice reference
      const { error } = await supabase
        .from('vehicle_inward_comments')
        .insert({
          vehicle_inward_id: selectedEntry.id,
          comment: `INVOICE_REF:link:${invoiceLink}`,
          created_by: user?.email || user?.id || 'accountant',
          role: 'accountant'
        })

      if (error) throw error

      setInvoiceLink('')
      await loadInvoiceReferences()
      alert('Invoice link added successfully!')
    } catch (error: any) {
      console.error('Error adding invoice link:', error)
      alert(`Failed to add invoice link: ${error.message}`)
    } finally {
      setInvoiceLoading(false)
    }
  }

  const handleUploadInvoice = async () => {
    if (!invoiceFile || !selectedEntry) return
    
    try {
      setInvoiceLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      // Convert file to base64 for storage
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string
        
        // Create a comment with attachment
        const { data: commentData, error: commentError } = await supabase
          .from('vehicle_inward_comments')
          .insert({
            vehicle_inward_id: selectedEntry.id,
            comment: `INVOICE_REF:${invoiceFile.type.startsWith('image/') ? 'image' : 'file'}:${invoiceFile.name}`,
            created_by: user?.email || user?.id || 'accountant',
            role: 'accountant'
          })
          .select()
          .single()

        if (commentError) throw commentError

        // Add attachment
        const { error: attachError } = await supabase
          .from('vehicle_inward_comment_attachments')
          .insert({
            comment_id: commentData.id,
            file_name: invoiceFile.name,
            file_url: base64,
            file_type: invoiceFile.type,
            file_size: invoiceFile.size
          })

        if (attachError) throw attachError

        // Update attachment count
        await supabase
          .from('vehicle_inward_comments')
          .update({ attachments_count: 1 })
          .eq('id', commentData.id)

        setInvoiceFile(null)
        await loadInvoiceReferences()
        alert('Invoice uploaded successfully!')
        setInvoiceLoading(false)
      }
      reader.readAsDataURL(invoiceFile)
    } catch (error: any) {
      console.error('Error uploading invoice:', error)
      alert(`Failed to upload invoice: ${error.message}`)
      setInvoiceLoading(false)
    }
  }

  const handleInvoiceNumberUpdate = async () => {
    if (!selectedEntry) return
    
    // Allow both admin and accountant to update invoice number
    if (userRole !== 'admin' && userRole !== 'accountant') return
    
    setUpdatingInvoiceNumber(true)
    
    try {
      // Get vehicle data to update notes
      const { data: vehicleData } = await supabase
        .from('vehicle_inward')
        .select('notes')
        .eq('id', selectedEntry.id)
        .single()
      
      // Parse existing notes or create new object
      let notesData: any = {}
      if (vehicleData?.notes) {
        try {
          notesData = JSON.parse(vehicleData.notes)
        } catch {
          notesData = {}
        }
      }
      
      // Update invoice number
      notesData.invoice_number = invoiceNumberInput.trim() || null
      
      // Update in database
      const { error } = await supabase
        .from('vehicle_inward')
        .update({ 
          notes: JSON.stringify(notesData),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEntry.id)
      
      if (error) throw error
      
      // Send WhatsApp notification if invoice number was added
      if (invoiceNumberInput.trim()) {
        try {
          const { data: vehicleData } = await supabase
            .from('vehicle_inward')
            .select('*')
            .eq('id', selectedEntry.id)
            .single()
          
          if (vehicleData) {
            // Import notification workflow dynamically
            const { notificationWorkflow } = await import('@/lib/notification-workflow')
            await notificationWorkflow.notifyInvoiceAdded(selectedEntry.id, vehicleData)
          }
        } catch (notifError) {
          console.error('Error sending notification:', notifError)
        }
      }
      
      // Update local state
      setSelectedEntry({
        ...selectedEntry,
        invoiceNumber: invoiceNumberInput.trim() || undefined
      })
      
      // Update entries list
      setEntries(prev => prev.map(entry => 
        entry.id === selectedEntry.id 
          ? { ...entry, invoiceNumber: invoiceNumberInput.trim() || undefined }
          : entry
      ))
      
      setEditingInvoiceNumber(false)
      alert('Invoice number updated successfully!')
      
    } catch (error: any) {
      console.error('Error updating invoice number:', error)
      alert(`Failed to update invoice number: ${error.message}`)
    } finally {
      setUpdatingInvoiceNumber(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!selectedEntry) return
    
    if (!confirm('Are you sure you want to mark this entry as Complete? This will finalize the accountant\'s work.')) {
      return
    }

    try {
      setUpdatingStatus(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let updateQuery = supabase
        .from('vehicle_inward')
        .update({ status: 'completed' })
        .eq('id', selectedEntry.id)
      
      // Add tenant filter for security
      if (!isSuper && tenantId) {
        updateQuery = updateQuery.eq('tenant_id', tenantId)
      }
      
      const { error } = await updateQuery

      if (error) throw error

      // Update the entry in local state immediately for better UX
      const updatedEntries = entries.filter(e => e.id !== selectedEntry.id)
      setEntries(updatedEntries)
      
      alert('Entry marked as Complete! The entry has been removed from the Accounts list.')
      setSelectedEntry(null)
      
      // Refresh to ensure consistency
      await fetchAccountEntries()
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert(`Failed to update status: ${error.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #2563eb',
            borderRadius: '50%',
            width: '3rem',
            height: '3rem',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: '#6b7280' }}>Loading account entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Accounts</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.5rem 0 0 0' }}>
              Manage invoicing for completed installations
            </p>
          </div>
          <button 
            onClick={() => {
              const csvContent = activeTab === 'completed' 
                ? generateCompletedCSV(filteredCompleted)
                : generateCSV(entries)
              downloadCSV(csvContent, activeTab === 'completed' ? 'completed_entries.csv' : 'account_entries.csv')
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          >
            <Download style={{ width: '1rem', height: '1rem' }} />
            Export All to CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{
            backgroundColor: '#eff6ff',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Entries</span>
              <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>{displayTotalEntries}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {activeTab === 'completed' ? 'Completed entries' : 'Ready for invoicing'}
            </div>
          </div>

          <div style={{
            backgroundColor: '#dcfce7',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Revenue</span>
              <DollarSign style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
              {formatCurrency(displayTotalRevenue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {activeTab === 'completed' ? 'Final revenue (after discounts)' : 'From all entries'}
            </div>
          </div>

          <div style={{
            backgroundColor: '#fef3c7',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #fde68a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Average Order</span>
              <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#d97706' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
              {formatCurrency(displayAvgOrderValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {activeTab === 'completed' ? 'Avg final order value' : 'Per installation'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
            <button
            onClick={() => setActiveTab('entries')}
              style={{
              padding: '1rem 0',
                border: 'none',
                backgroundColor: 'transparent',
              color: activeTab === 'entries' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'entries' ? '600' : '400',
              borderBottom: activeTab === 'entries' ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
              }}
            >
            <FileText style={{ width: '1rem', height: '1rem' }} />
            Account Entries
            </button>
            <button
            onClick={() => {
              setActiveTab('completed')
              fetchCompletedEntries()
            }}
              style={{
              padding: '1rem 0',
                border: 'none',
                backgroundColor: 'transparent',
              color: activeTab === 'completed' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'completed' ? '600' : '400',
              borderBottom: activeTab === 'completed' ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
              }}
            >
            <CheckCircle style={{ width: '1rem', height: '1rem' }} />
            Completed
            </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {activeTab === 'entries' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Search Bar */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#94a3b8'
                }} />
                <input
                  type="text"
                  placeholder="Search by customer, vehicle number, or entry ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: 'white',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb'
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {/* Entries List */}
            <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
              {filteredEntries.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <FileText style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                    {searchTerm ? 'No entries found' : 'No entries available'}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {searchTerm
                      ? 'Try adjusting your search terms'
                      : 'Entries with "Installation Complete" status will appear here'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                              style={{
                        backgroundColor: selectedEntry?.id === entry.id ? '#eff6ff' : '#f9fafb',
                        borderRadius: '0.75rem',
                        border: selectedEntry?.id === entry.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: selectedEntry?.id === entry.id ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedEntry?.id !== entry.id) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9'
                          e.currentTarget.style.borderColor = '#cbd5e1'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedEntry?.id !== entry.id) {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                          e.currentTarget.style.borderColor = '#e2e8f0'
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#059669',
                              color: 'white',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {entry.shortId || entry.id.substring(0, 8)}
                            </div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                              {entry.customerName}
                            </h3>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <CheckCircle style={{ width: '0.75rem', height: '0.75rem' }} />
                              Installation Complete
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Car style={{ width: '1rem', height: '1rem' }} />
                              <span>{entry.model} ({entry.vehicleNumber})</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Calendar style={{ width: '1rem', height: '1rem' }} />
                              <span>Completed: {formatDate(entry.installationCompleteDate)}</span>
                            </div>
                            {entry.location && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MapPin style={{ width: '1rem', height: '1rem' }} />
                                <span>{locationNames.get(entry.location) || entry.location}</span>
                              </div>
                            )}
                            {entry.manager && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User style={{ width: '1rem', height: '1rem' }} />
                                <span>{managerNames.get(entry.manager) || entry.manager}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Amount</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>
                            {formatCurrency(entry.totalAmount)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            {entry.products.length} {entry.products.length === 1 ? 'product' : 'products'}
                          </div>
                        </div>
                      </div>

                      {/* Products Preview */}
                      {entry.products.length > 0 && (
                        <div style={{
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          border: '1px solid #e2e8f0',
                          marginTop: '1rem'
                        }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package style={{ width: '1rem', height: '1rem' }} />
                            Product Details ({entry.products.length})
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
                            {entry.products.slice(0, 3).map((product, idx) => (
                              <div key={idx} style={{
                                padding: '0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e7eb'
                              }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                                  {product.product}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                  Brand: {product.brand} | {departmentNames.get(product.department) || product.department}
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#059669' }}>
                                  {formatCurrency(product.price)}
                                </div>
                              </div>
                            ))}
                            {entry.products.length > 3 && (
                              <div style={{
                                padding: '0.75rem',
                                backgroundColor: '#eff6ff',
                                borderRadius: '0.5rem',
                                border: '1px solid #bfdbfe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                color: '#2563eb',
                                fontWeight: '500'
                              }}>
                                +{entry.products.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Tab */}
        {activeTab === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Time Filter and Analytics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              {/* Time Filter */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Filter style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Time Period Filter</h3>
                  </div>
                  <button
                    onClick={() => {
                      const csvContent = generateCompletedCSV(filteredCompleted)
                      const periodLabel = timeFilter === 'all' ? 'all_time' : 
                                        timeFilter === 'custom' ? `custom_${customStartDate || 'range'}_${customEndDate || 'range'}` :
                                        `last_${timeFilter}`
                      downloadCSV(csvContent, `completed_entries_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`)
                    }}
                    disabled={filteredCompleted.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: filteredCompleted.length === 0 ? '#f3f4f6' : '#059669',
                      color: filteredCompleted.length === 0 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: filteredCompleted.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (filteredCompleted.length > 0) {
                        e.currentTarget.style.backgroundColor = '#047857'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filteredCompleted.length > 0) {
                        e.currentTarget.style.backgroundColor = '#059669'
                      }
                    }}
                    title={filteredCompleted.length === 0 ? 'No data to export' : `Export ${filteredCompleted.length} entries`}
                  >
                    <Download style={{ width: '0.875rem', height: '0.875rem' }} />
                    Export CSV
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {['all', 'today', 'week', 'month', 'year', 'custom'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimeFilter(period)}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: timeFilter === period ? '#eff6ff' : '#f9fafb',
                        color: timeFilter === period ? '#2563eb' : '#374151',
                        border: timeFilter === period ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: timeFilter === period ? '600' : '400',
                        cursor: 'pointer',
                        textAlign: 'left',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s'
                      }}
                    >
                      {period === 'all' ? 'All Time' : period === 'custom' ? 'Custom Range' : `Last ${period}`}
                    </button>
                  ))}
                </div>
                {timeFilter === 'custom' && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Analytics Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Completed Entries</span>
                    <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
                  </div>
                  <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>{completedTotal}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {completedLoading ? 'Loading...' : 'In selected period'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#dcfce7', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Final Revenue</span>
                    <DollarSign style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
                  </div>
                  <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
                    {formatCurrency(completedRevenue)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    After discounts
                  </div>
                </div>

                <div style={{ backgroundColor: '#fef3c7', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Discounts</span>
                    <Percent style={{ width: '1.25rem', height: '1.25rem', color: '#d97706' }} />
                  </div>
                  <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
                    {formatCurrency(totalDiscountsGiven)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {avgDiscountPercentage.toFixed(1)}% of revenue
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Analytics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Avg Order Value</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                  {formatCurrency(avgCompletedOrderValue)}
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Avg Discount</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>
                  {formatCurrency(avgDiscount)}
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Discount Ratio</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                  {discountRatio.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {entriesWithDiscount} of {completedTotal} entries
                </div>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Original Revenue</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                  {formatCurrency(completedOriginalRevenue)}
                </div>
              </div>
            </div>

            {/* Completed Entries List */}
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Search Bar */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#94a3b8'
                  }} />
                  <input
                    type="text"
                    placeholder="Search completed entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {filteredCompleted.length} {filteredCompleted.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>

              {/* Entries List */}
              <div style={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto', padding: '1.5rem' }}>
                {completedLoading ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <div style={{
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #2563eb',
                      borderRadius: '50%',
                      width: '3rem',
                      height: '3rem',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }}></div>
                    <p style={{ color: '#6b7280' }}>Loading completed entries...</p>
                  </div>
                ) : filteredCompleted.length === 0 ? (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <CheckCircle style={{ width: '3rem', height: '3rem', color: '#cbd5e1', margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                      {searchTerm ? 'No entries found' : 'No completed entries in selected period'}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {searchTerm ? 'Try adjusting your search terms' : 'Completed entries will appear here'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredCompleted.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        style={{
                          backgroundColor: selectedEntry?.id === entry.id ? '#eff6ff' : '#f9fafb',
                          borderRadius: '0.75rem',
                          border: selectedEntry?.id === entry.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          padding: '1.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              <div style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#10b981',
                                color: 'white',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {entry.shortId || entry.id.substring(0, 8)}
                              </div>
                              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                {entry.customerName}
                              </h3>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                Completed
                              </span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                              {entry.model} • {entry.vehicleNumber}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                              {entry.location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <MapPin style={{ width: '1rem', height: '1rem' }} />
                                  {locationNames.get(entry.location) || entry.location}
                                </div>
                              )}
                              {entry.completed_at && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Calendar style={{ width: '1rem', height: '1rem' }} />
                                  Completed: {formatDate(entry.completed_at)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                              {entry.discountAmount && entry.discountAmount > 0 ? (
                                <>
                                  <div style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                                    {formatCurrency(entry.totalAmount)}
                                  </div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#10b981', marginTop: '0.25rem' }}>
                                    {formatCurrency(entry.finalAmount || entry.totalAmount)}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                    -{formatCurrency(entry.discountAmount)} ({entry.discountPercentage?.toFixed(1)}%)
                                  </div>
                                  {entry.discountOfferedBy && (
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                      By: {entry.discountOfferedBy}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                                  {formatCurrency(entry.totalAmount)}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                              {entry.products.length} {entry.products.length === 1 ? 'product' : 'products'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div
          style={{
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
          onClick={() => setSelectedEntry(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Account Entry Details
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  {selectedEntry.shortId || selectedEntry.id.substring(0, 8)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb'
                  e.currentTarget.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                  e.currentTarget.style.color = '#6b7280'
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* Customer Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User style={{ width: '1.25rem', height: '1.25rem' }} />
                  Customer Information
                </h3>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Name</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.customerName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Phone</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.customerPhone}</div>
                    </div>
                    {selectedEntry.customerEmail && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Email</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.customerEmail}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Car style={{ width: '1.25rem', height: '1.25rem' }} />
                  Vehicle Information
                </h3>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Vehicle Number</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.vehicleNumber}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Model</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.model}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Make</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.make}</div>
                    </div>
                    {selectedEntry.year && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Year</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.year}</div>
                      </div>
                    )}
                    {selectedEntry.color && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Color</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{selectedEntry.color}</div>
                      </div>
                    )}
                    {selectedEntry.vehicleType && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Vehicle Type</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                          {vehicleTypeNames.get(selectedEntry.vehicleType) || selectedEntry.vehicleType}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Installation Details */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar style={{ width: '1.25rem', height: '1.25rem' }} />
                  Installation Details
                </h3>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Installation Complete Date</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                        {formatDate(selectedEntry.installationCompleteDate)}
                      </div>
                    </div>
                    {selectedEntry.expectedDelivery && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Expected Delivery</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                          {new Date(selectedEntry.expectedDelivery).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                    {selectedEntry.location && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Location</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                          {locationNames.get(selectedEntry.location) || selectedEntry.location}
                        </div>
                      </div>
                    )}
                    {selectedEntry.manager && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Assigned Manager</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                          {managerNames.get(selectedEntry.manager) || selectedEntry.manager}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Details with Prices - Editable */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Package style={{ width: '1.25rem', height: '1.25rem' }} />
                    Product Details & Pricing
                  </h3>
                  {!editingProducts && (
                    <button
                      onClick={handleEditProducts}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                      <Edit2 style={{ width: '1rem', height: '1rem' }} />
                      Edit Products
                    </button>
                  )}
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Product
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Brand
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Department
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedProducts.length > 0 ? (
                        editedProducts.map((product, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < editedProducts.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {editingProducts ? (
                                <input
                                  type="text"
                                  value={product.product}
                                  onChange={(e) => handleProductChange(idx, 'product', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                                  {product.product}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {editingProducts ? (
                                <input
                                  type="text"
                                  value={product.brand}
                                  onChange={(e) => handleProductChange(idx, 'brand', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                  {product.brand}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              {editingProducts ? (
                                <select
                                  value={product.department}
                                  onChange={(e) => handleProductChange(idx, 'department', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  {Array.from(departmentNames.entries()).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                                  {departmentNames.get(product.department) || product.department}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              {editingProducts ? (
                                <input
                                  type="number"
                                  value={product.price}
                                  onChange={(e) => handleProductChange(idx, 'price', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    textAlign: 'right'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>
                                  {formatCurrency(product.price)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                            No products listed
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                      <tr>
                        <td colSpan={3} style={{ padding: '1rem', fontSize: '1rem', fontWeight: '700', color: '#1e293b', textAlign: 'right' }}>
                          Total Amount:
                        </td>
                        <td style={{ padding: '1rem', fontSize: '1.125rem', fontWeight: '700', color: '#059669', textAlign: 'right' }}>
                          {formatCurrency(editedProducts.reduce((sum, p) => sum + p.price, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {editingProducts && (
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <X style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.25rem' }} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProducts}
                      disabled={savingProducts}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: savingProducts ? '#9ca3af' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: savingProducts ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Save style={{ width: '1rem', height: '1rem' }} />
                      {savingProducts ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              {/* Discount Information - Only for Completed Entries */}
              {selectedEntry.status === 'completed' && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Percent style={{ width: '1.25rem', height: '1.25rem' }} />
                      Discount Information
                    </h3>
                    {!editingDiscount && (
                      <button
                        onClick={() => setEditingDiscount(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 style={{ width: '1rem', height: '1rem' }} />
                        {selectedEntry.discountAmount && selectedEntry.discountAmount > 0 ? 'Edit Discount' : 'Add Discount'}
                      </button>
                    )}
                  </div>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                    {editingDiscount ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Discount Amount (Rs.)
                          </label>
                          <input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Enter discount amount"
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Offered By (Name/Department)
                          </label>
                          <input
                            type="text"
                            value={discountOfferedBy}
                            onChange={(e) => setDiscountOfferedBy(e.target.value)}
                            placeholder="e.g., Manager Name, Sales Team"
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
                            Discount Reason
                          </label>
                          <textarea
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            placeholder="Reason for discount (e.g., Bulk order, Loyalty customer)"
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '0.625rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setEditingDiscount(false)
                              if (selectedEntry) {
                                setDiscountAmount(selectedEntry.discountAmount?.toString() || '')
                                setDiscountOfferedBy(selectedEntry.discountOfferedBy || '')
                                setDiscountReason(selectedEntry.discountReason || '')
                              }
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!selectedEntry) return
                              try {
                                setSavingDiscount(true)
                                const discount = parseFloat(discountAmount) || 0
                                const discountPercentage = selectedEntry.totalAmount > 0 ? (discount / selectedEntry.totalAmount) * 100 : 0
                                
                                // Store discount data in notes field as JSON
                                const discountData = {
                                  discount_amount: discount,
                                  discount_percentage: discountPercentage,
                                  discount_offered_by: discountOfferedBy,
                                  discount_reason: discountReason
                                }
                                
                                // Get existing notes or create new
                                const tenantId = getCurrentTenantId()
                                const isSuper = isSuperAdmin()
                                
                                let notesQuery = supabase
                                  .from('vehicle_inward')
                                  .select('notes')
                                  .eq('id', selectedEntry.id)
                                
                                if (!isSuper && tenantId) {
                                  notesQuery = notesQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { data: existing } = await notesQuery.single()
                                
                                let notesData: any = {}
                                if (existing?.notes) {
                                  try {
                                    notesData = JSON.parse(existing.notes)
                                  } catch {
                                    notesData = {}
                                  }
                                }
                                
                                notesData.discount = discountData
                                
                                let updateNotesQuery = supabase
                                  .from('vehicle_inward')
                                  .update({ notes: JSON.stringify(notesData) })
                                  .eq('id', selectedEntry.id)
                                
                                if (!isSuper && tenantId) {
                                  updateNotesQuery = updateNotesQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { error } = await updateNotesQuery
                                
                                if (error) throw error
                                
                                // Update local state
                                const updatedEntry = {
                                  ...selectedEntry,
                                  discountAmount: discount,
                                  discountPercentage: discountPercentage,
                                  discountOfferedBy: discountOfferedBy,
                                  discountReason: discountReason,
                                  finalAmount: selectedEntry.totalAmount - discount
                                }
                                setSelectedEntry(updatedEntry)
                                
                                // Update in completed entries list
                                if (activeTab === 'completed') {
                                  setCompletedEntries(completedEntries.map(e => 
                                    e.id === selectedEntry.id ? updatedEntry : e
                                  ))
                                }
                                
                                setEditingDiscount(false)
                                alert('Discount information saved successfully!')
                                await fetchCompletedEntries()
                              } catch (error: any) {
                                console.error('Error saving discount:', error)
                                alert(`Failed to save discount: ${error.message}`)
                              } finally {
                                setSavingDiscount(false)
                              }
                            }}
                            disabled={savingDiscount}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: savingDiscount ? '#9ca3af' : '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: savingDiscount ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Save style={{ width: '1rem', height: '1rem' }} />
                            {savingDiscount ? 'Saving...' : 'Save Discount'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Discount Amount</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: selectedEntry.discountAmount && selectedEntry.discountAmount > 0 ? '#ef4444' : '#9ca3af' }}>
                            {selectedEntry.discountAmount && selectedEntry.discountAmount > 0 
                              ? formatCurrency(selectedEntry.discountAmount) 
                              : 'No discount'}
                          </div>
                        </div>
                        {selectedEntry.discountAmount && selectedEntry.discountAmount > 0 && (
                          <>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Discount Percentage</div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>
                                {selectedEntry.discountPercentage?.toFixed(2) || '0'}%
                              </div>
                            </div>
                            {selectedEntry.discountOfferedBy && (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Offered By</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                  {selectedEntry.discountOfferedBy}
                                </div>
                              </div>
                            )}
                            {selectedEntry.discountReason && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Reason</div>
                                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                                  {selectedEntry.discountReason}
                                </div>
                              </div>
                            )}
                            <div style={{ gridColumn: '1 / -1', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', marginTop: '0.5rem', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Final Amount (After Discount):</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                                  {formatCurrency(selectedEntry.finalAmount || selectedEntry.totalAmount)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invoice Number - Editable for Admin and Accountant */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
                  Invoice Number
                </h3>
                {(userRole === 'admin' || userRole === 'accountant') ? (
                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: '0.75rem', 
                    padding: '1.25rem',
                    border: '1px solid #bae6fd'
                  }}>
                    {editingInvoiceNumber ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.25rem' }}>
                          Invoice Number (External Platform):
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={invoiceNumberInput}
                            onChange={(e) => setInvoiceNumberInput(e.target.value)}
                            placeholder="Enter invoice number from external platform"
                            style={{
                              flex: 1,
                              padding: '0.625rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.875rem',
                              outline: 'none',
                              focus: { borderColor: '#0284c7' }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInvoiceNumberUpdate()
                              } else if (e.key === 'Escape') {
                                setEditingInvoiceNumber(false)
                                setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
                              }
                            }}
                            autoFocus
                          />
                          <button
                            onClick={handleInvoiceNumberUpdate}
                            disabled={updatingInvoiceNumber}
                            style={{
                              padding: '0.625rem 1rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#0284c7',
                              color: 'white',
                              border: 'none',
                              cursor: updatingInvoiceNumber ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              opacity: updatingInvoiceNumber ? 0.6 : 1
                            }}
                          >
                            {updatingInvoiceNumber ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingInvoiceNumber(false)
                              setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
                            }}
                            disabled={updatingInvoiceNumber}
                            style={{
                              padding: '0.625rem 1rem',
                              borderRadius: '0.5rem',
                              backgroundColor: '#e5e7eb',
                              color: '#374151',
                              border: 'none',
                              cursor: updatingInvoiceNumber ? 'not-allowed' : 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem', fontWeight: '600' }}>
                            Invoice Number (External Platform):
                          </div>
                          <div style={{ 
                            fontSize: '1.125rem', 
                            fontWeight: '700', 
                            color: selectedEntry.invoiceNumber ? '#0c4a6e' : '#9ca3af',
                            letterSpacing: '0.05em'
                          }}>
                            {selectedEntry.invoiceNumber || 'No invoice number set'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingInvoiceNumber(true)
                            setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#0284c7',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            whiteSpace: 'nowrap'
                          }}
                          title={selectedEntry.invoiceNumber ? 'Edit invoice number' : 'Add invoice number'}
                        >
                          <Edit2 style={{ width: '1rem', height: '1rem' }} />
                          {selectedEntry.invoiceNumber ? 'Edit' : 'Add'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Display only for other roles
                  selectedEntry.invoiceNumber && (
                    <div style={{ 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: '0.75rem', 
                      padding: '1.25rem',
                      border: '1px solid #bae6fd'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem', fontWeight: '600' }}>
                          Invoice Number (External Platform):
                        </div>
                        <div style={{ 
                          fontSize: '1.125rem', 
                          fontWeight: '700', 
                          color: '#0c4a6e',
                          letterSpacing: '0.05em'
                        }}>
                          {selectedEntry.invoiceNumber}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Invoice References */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
                  Invoice References (Optional)
                </h3>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.75rem', padding: '1.25rem', border: '1px solid #e5e7eb' }}>
                  {/* Add Invoice Link */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Paste invoice link (URL)"
                        value={invoiceLink}
                        onChange={(e) => setInvoiceLink(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                      <button
                        onClick={handleAddInvoiceLink}
                        disabled={!invoiceLink.trim() || invoiceLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: invoiceLoading || !invoiceLink.trim() ? '#9ca3af' : '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: invoiceLoading || !invoiceLink.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <LinkIcon style={{ width: '1rem', height: '1rem' }} />
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* Upload Invoice File */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <label
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: invoiceFile ? '#111827' : '#9ca3af'
                        }}
                      >
                        <Upload style={{ width: '1rem', height: '1rem' }} />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                          style={{ display: 'none' }}
                        />
                        {invoiceFile ? invoiceFile.name : 'Upload Invoice (PDF/Image)'}
                      </label>
                      <button
                        onClick={handleUploadInvoice}
                        disabled={!invoiceFile || invoiceLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 1rem',
                          backgroundColor: invoiceLoading || !invoiceFile ? '#9ca3af' : '#059669',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: invoiceLoading || !invoiceFile ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Upload style={{ width: '1rem', height: '1rem' }} />
                        Upload
                      </button>
                    </div>
                  </div>

                  {/* Display Invoice References */}
                  {invoiceReferences.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
                        Added References:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {invoiceReferences.map((ref, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: 'white',
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            {ref.type === 'link' ? (
                              <LinkIcon style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                            ) : (
                              <FileImage style={{ width: '1rem', height: '1rem', color: '#059669' }} />
                            )}
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                flex: 1,
                                fontSize: '0.875rem',
                                color: '#2563eb',
                                textDecoration: 'none'
                              }}
                            >
                              {ref.fileName || ref.url.substring(0, 50)}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments and Attachments */}
              <div style={{ marginBottom: '2rem' }}>
                <VehicleCommentsSection vehicleId={selectedEntry.id} userRole={userRole} />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                {/* Mark Complete Button */}
                {selectedEntry.status === 'installation_complete' && (
                  <button
                    onClick={handleMarkComplete}
                    disabled={updatingStatus}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      backgroundColor: updatingStatus ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      cursor: updatingStatus ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: updatingStatus ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      if (!updatingStatus) e.currentTarget.style.backgroundColor = '#059669'
                    }}
                    onMouseLeave={(e) => {
                      if (!updatingStatus) e.currentTarget.style.backgroundColor = '#10b981'
                    }}
                  >
                    <CheckCircle style={{ width: '1.125rem', height: '1.125rem' }} />
                    {updatingStatus ? 'Marking Complete...' : 'Mark as Complete'}
                  </button>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                  <button
                    onClick={() => {
                      const csvContent = generateEntryCSV(selectedEntry)
                      downloadCSV(csvContent, `entry_${selectedEntry.shortId || selectedEntry.id.substring(0, 8)}.csv`)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1.25rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  >
                    <Download style={{ width: '1rem', height: '1rem' }} />
                    Export CSV
                  </button>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
