'use client'

import { useState, useEffect, useRef } from 'react'
import { DollarSign, FileText, TrendingUp, Eye, Download, Search, Calendar, User, Car, Package, MapPin, Building, AlertCircle, CheckCircle, Clock, Edit2, Save, X, Upload, Link as LinkIcon, FileImage, BarChart3, Filter, Percent, Users, Edit, Ban, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, MessageSquare } from 'lucide-react'
import InvoiceDetailModal from '@/components/InvoiceDetailModal'
import PaymentRecordingModal from '@/components/PaymentRecordingModal'
import { createClient } from '@/lib/supabase/client'
import VehicleCommentsSection from '@/components/VehicleCommentsSection'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'
import { logger } from '@/lib/logger'

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
  entryStatus?: string // 'Na' | 'Draft' | 'Partial' | 'Paid'
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

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  paid_amount: number
  balance_amount: number
  status: string
  due_date?: string
  vehicle_id?: string
  created_at?: string
  updated_at?: string
}

interface PaymentHistory {
  id: string
  invoice_id: string
  amount: number
  payment_method: string
  payment_date: string
  notes?: string
  created_at: string
  created_by?: string
}

interface Summary {
  totalEntries: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  completedEntries: number
}

export default function AccountsPageClient() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('entries') // Default to Account Entries tab
  const [entries, setEntries] = useState<AccountEntry[]>([])
  const [completedEntries, setCompletedEntries] = useState<AccountEntry[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [completedLoading, setCompletedLoading] = useState(false)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<string>('all') // 'all', 'today', 'week', 'month', 'year', 'custom'
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
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
  const [showInvoiceSection, setShowInvoiceSection] = useState(false)
  const [userRole, setUserRole] = useState('accountant')
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [discountAmount, setDiscountAmount] = useState<string>('')
  const [discountOfferedBy, setDiscountOfferedBy] = useState<string>('')
  const [discountReason, setDiscountReason] = useState<string>('')
  const [savingDiscount, setSavingDiscount] = useState(false)
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState(false)
  const [invoiceNumberInput, setInvoiceNumberInput] = useState<string>('')
  const [updatingInvoiceNumber, setUpdatingInvoiceNumber] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage] = useState(10)
  const [settledInvoicesPage, setSettledInvoicesPage] = useState(1)
  const [settledEntriesPage, setSettledEntriesPage] = useState(1)
  const [nextPaymentDueDate, setNextPaymentDueDate] = useState<string>('')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null)
  const supabase = createClient()
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]) // Store timeout IDs for cleanup

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutRefs.current = []
    }
  }, [])

  useEffect(() => {
    loadRelatedData()
    loadUserRole()
    fetchSummary()
    
    // Set loading state based on which tab is active
    if (activeTab === 'entries' || activeTab === 'completed') {
      // Legacy tabs - keep for backward compatibility
      setLoading(true)
      if (activeTab === 'entries') {
        fetchAccountEntries()
      } else {
        fetchCompletedEntries()
      }
    } else if (activeTab === 'settled') {
      // Settled/Completed tab: show both settled invoices AND completed entries
      setLoading(false) // Clear main loading since we use invoicesLoading
      setInvoicesLoading(true)
      setCompletedLoading(true)
      fetchInvoicesByStatus('settled')
      fetchCompletedEntries() // Also fetch completed entries
    } else {
      // New invoice status tabs
      setLoading(false) // Clear main loading since we use invoicesLoading
      setInvoicesLoading(true)
      fetchInvoicesByStatus(activeTab)
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
      
      // Find invoice for this entry and fetch payment history
      findInvoiceForEntry(selectedEntry.id)
    }
  }, [selectedEntry])

  // Update due date state when invoice changes
  useEffect(() => {
    if (selectedInvoiceForPayment?.due_date) {
      setNextPaymentDueDate(selectedInvoiceForPayment.due_date)
    } else {
      setNextPaymentDueDate('')
    }
    setEditingDueDate(false)
  }, [selectedInvoiceForPayment])

  // Sync discount from invoice to selectedEntry.notes when invoice changes
  // This ensures consistent display whether checking invoice or notes
  useEffect(() => {
    if (selectedInvoiceForPayment && selectedEntry) {
      const invoiceDiscount = selectedInvoiceForPayment.discount_amount || 0
      try {
        let notesData: any = {}
        if (selectedEntry.notes) {
          try {
            notesData = typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes
          } catch {
            notesData = {}
          }
        }
        
        // Only update if notes discount doesn't match invoice discount (or if invoice has discount but notes don't)
        const notesDiscount = notesData.discount?.discount_amount || 0
        if (Math.abs(notesDiscount - invoiceDiscount) > 0.01) {
          // Update discount in notes to match invoice
          if (!notesData.discount) {
            notesData.discount = {}
          }
          notesData.discount.discount_amount = invoiceDiscount
          notesData.discount.discount_reason = selectedInvoiceForPayment.discount_reason || notesData.discount.discount_reason || ''
          
          const updatedEntry = {
            ...selectedEntry,
            discountAmount: invoiceDiscount,
            discountReason: selectedInvoiceForPayment.discount_reason || selectedEntry.discountReason || '',
            notes: JSON.stringify(notesData)
          }
          setSelectedEntry(updatedEntry)
        }
      } catch (syncError) {
        logger.error('Error syncing discount from invoice to entry notes:', syncError)
        // Don't fail, just log
      }
    }
  }, [selectedInvoiceForPayment?.discount_amount, selectedInvoiceForPayment?.discount_reason, selectedEntry?.id])

  // Reset to page 1 when search term or filters change
  useEffect(() => {
    setCurrentPage(1)
    setSettledInvoicesPage(1)
    setSettledEntriesPage(1)
    setShowFilterDropdown(false) // Close dropdown when switching tabs
  }, [searchTerm, timeFilter, customStartDate, customEndDate, activeTab])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showFilterDropdown && !target.closest('[data-filter-dropdown]')) {
        setShowFilterDropdown(false)
      }
    }

    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showFilterDropdown])

  const findInvoiceForEntry = async (vehicleInwardId: string) => {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
        .eq('vehicle_inward_id', vehicleInwardId)
        .maybeSingle()  // Returns null if no invoice exists, doesn't throw
      
      if (invoiceError) {
        // Only log actual query errors, not "no rows found"
        if (invoiceError.code !== 'PGRST116') {
          logger.error('Error finding invoice for entry:', invoiceError)
        }
        setSelectedInvoiceForPayment(null)
        setPaymentHistory([])
        return
      }

      if (invoice) {
        setSelectedInvoiceForPayment(invoice)
        fetchPaymentHistory(invoice.id)
      } else {
        // No invoice exists - this is expected, not an error
        setSelectedInvoiceForPayment(null)
        setPaymentHistory([])
      }
    } catch (error) {
      // Catch any unexpected errors
      logger.error('Unexpected error finding invoice for entry:', error)
      setSelectedInvoiceForPayment(null)
      setPaymentHistory([])
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/invoices/summary')
      const data = await response.json()
      
      if (!response.ok) {
        logger.error('Error fetching summary:', data.error || data.message)
        // Set default empty summary if there's an error
        setSummary({
          totalInvoiced: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          byStatus: []
        })
        return
      }
      
      if (data.summary) {
        setSummary(data.summary)
      } else {
        // Set default empty summary
        setSummary({
          totalInvoiced: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          byStatus: []
        })
      }
    } catch (error) {
      logger.error('Error fetching summary:', error)
      // Set default empty summary on error
      setSummary({
        totalInvoiced: 0,
        totalReceived: 0,
        totalOutstanding: 0,
        totalOverdue: 0,
        byStatus: []
      })
    }
  }

  const fetchInvoicesByStatus = async (status: string) => {
    try {
      setInvoicesLoading(true)
      
      // Special handling for 'settled' status - must be fully paid AND delivered
      if (status === 'settled') {
        const tenantId = getCurrentTenantId()
        const isSuper = isSuperAdmin()
        
        // Step 1: Fetch fully paid invoices (status='paid' AND balance_amount = 0)
        let invoiceQuery = supabase
          .from('invoices')
          .select('*')
          .eq('status', 'paid')
          .eq('balance_amount', 0)
          .order('created_at', { ascending: false })
        
        // Add tenant filter
        if (!isSuper && tenantId) {
          invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
        }
        
        // Apply time filter for invoices
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
          invoiceQuery = invoiceQuery.gte('invoice_date', startDate.toISOString().split('T')[0])
        }
        
        if (timeFilter === 'custom' && customEndDate) {
          invoiceQuery = invoiceQuery.lte('invoice_date', customEndDate)
        }
        
        const { data: invoicesData, error: invoicesError } = await invoiceQuery
        
        if (invoicesError) {
          logger.error('Error fetching settled invoices:', invoicesError)
          setInvoices([])
          return
        }
        
        if (!invoicesData || invoicesData.length === 0) {
          setInvoices([])
          return
        }
        
        // Filter to ensure invoices are fully paid (balance_amount = 0 OR paid_amount >= total_amount)
        const fullyPaidInvoices = invoicesData.filter((invoice: any) => {
          const balanceAmount = parseFloat(invoice.balance_amount || 0)
          const paidAmount = parseFloat(invoice.paid_amount || 0)
          const totalAmount = parseFloat(invoice.total_amount || 0)
          return balanceAmount === 0 || paidAmount >= totalAmount
        })
        
        if (fullyPaidInvoices.length === 0) {
          setInvoices([])
          return
        }
        
        // Step 2: Fetch delivered vehicle_inward entries
        const deliveredStatuses = ['delivered', 'delivered_final', 'delivered (final)', 'complete_and_delivered']
        const invoiceVehicleInwardIds = fullyPaidInvoices
          .map((inv: any) => inv.vehicle_inward_id)
          .filter((id: string | null) => id !== null)
        
        if (invoiceVehicleInwardIds.length === 0) {
          setInvoices([])
          return
        }
        
        let vehicleInwardQuery = supabase
          .from('vehicle_inward')
          .select('id, status, customer_name, registration_number, model, make')
          .in('id', invoiceVehicleInwardIds)
          .in('status', deliveredStatuses)
        
        // Add tenant filter
        if (!isSuper && tenantId) {
          vehicleInwardQuery = vehicleInwardQuery.eq('tenant_id', tenantId)
        }
        
        const { data: deliveredVehicles, error: vehiclesError } = await vehicleInwardQuery
        
        if (vehiclesError) {
          logger.error('Error fetching delivered vehicles:', vehiclesError)
          setInvoices([])
          return
        }
        
        // Step 3: Match invoices to delivered vehicle_inward entries
        const deliveredVehicleIds = new Set((deliveredVehicles || []).map((v: any) => v.id))
        const settledInvoices = fullyPaidInvoices.filter((invoice: any) => 
          invoice.vehicle_inward_id && deliveredVehicleIds.has(invoice.vehicle_inward_id)
        )
        
        // Step 4: Apply search filter if provided
        let filteredInvoices = settledInvoices
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          filteredInvoices = settledInvoices.filter((invoice: any) => {
            const vehicle = deliveredVehicles?.find((v: any) => v.id === invoice.vehicle_inward_id)
            return (
              invoice.invoice_number?.toLowerCase().includes(searchLower) ||
              vehicle?.customer_name?.toLowerCase().includes(searchLower) ||
              vehicle?.registration_number?.toLowerCase().includes(searchLower)
            )
          })
        }
        
        // Step 5: Enrich invoices with vehicle_inward data
        const enrichedInvoices = filteredInvoices.map((invoice: any) => {
          const vehicle = deliveredVehicles?.find((v: any) => v.id === invoice.vehicle_inward_id)
          return {
            ...invoice,
            vehicle_inward: {
              id: vehicle?.id,
              status: vehicle?.status,
              vehicles: {
                registration_number: vehicle?.registration_number,
                make: vehicle?.make,
                model: vehicle?.model,
                customers: {
                  name: vehicle?.customer_name
                }
              }
            }
          }
        })
        
        setInvoices(enrichedInvoices)
        return
      }
      
      // Existing logic for other statuses
      const params = new URLSearchParams()
      // Only add status filter if not 'all'
      if (status && status !== 'all') {
        params.append('status', status)
      }
      if (timeFilter === 'custom' && customStartDate) {
        params.append('startDate', customStartDate)
      }
      if (timeFilter === 'custom' && customEndDate) {
        params.append('endDate', customEndDate)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const queryString = params.toString()
      const url = `/api/invoices${queryString ? `?${queryString}` : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        logger.error('Error fetching invoices:', data.error || data.message)
        // If it's a migration issue, show helpful message
        if (data.message?.includes('migrations')) {
          logger.warn('Database migrations may not have been run yet.')
        }
        setInvoices([])
        return
      }
      
      if (data.invoices) {
        // Check for overdue invoices and update status if needed
        const today = new Date().toISOString().split('T')[0]
        const updatedInvoices = data.invoices.map((invoice: any) => {
          if ((invoice.status === 'issued' || invoice.status === 'partial') && 
              invoice.due_date && 
              invoice.due_date < today && 
              invoice.balance_amount > 0) {
            // Mark as overdue if not already
            return { ...invoice, status: 'overdue' }
          }
          return invoice
        })
        setInvoices(updatedInvoices)
      } else {
        setInvoices([])
      }
    } catch (error) {
      logger.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      setInvoicesLoading(false)
    }
  }

  const fetchPaymentHistory = async (invoiceId: string) => {
    try {
      setLoadingPayments(true)
      const response = await fetch(`/api/invoices/${invoiceId}/payments`)
      const data = await response.json()
      
      if (response.ok && data.payments) {
        setPaymentHistory(data.payments)
      } else {
        setPaymentHistory([])
      }
    } catch (error) {
      logger.error('Error fetching payment history:', error)
      setPaymentHistory([])
    } finally {
      setLoadingPayments(false)
    }
  }

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
      logger.error('Error loading user role:', error)
    }
  }

  const calculateEntryStatus = (
    invoiceNumber: string | undefined,
    invoice: { paid_amount: number; balance_amount: number; total_amount: number } | null
  ): string => {
    if (!invoiceNumber || invoiceNumber.trim() === '') {
      return 'Na'
    }
    
    if (!invoice || !invoice.paid_amount || invoice.paid_amount === 0) {
      return 'Draft'
    }
    
    if (invoice.balance_amount > 0) {
      return 'Partial'
    }
    
    return 'Paid'
  }

  const getStatusBadgeStyle = (status: string) => {
    const baseStyle = {
      padding: '0.25rem 0.75rem',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: '600',
      display: 'inline-block'
    }

    switch (status) {
      case 'Na':
        return {
          ...baseStyle,
          backgroundColor: '#6b7280',
          color: 'white'
        }
      case 'Draft':
        return {
          ...baseStyle,
          backgroundColor: '#f59e0b',
          color: 'white'
        }
      case 'Partial':
        return {
          ...baseStyle,
          backgroundColor: '#3b82f6',
          color: 'white'
        }
      case 'Paid':
        return {
          ...baseStyle,
          backgroundColor: '#10b981',
          color: 'white'
        }
      default:
        return {
          ...baseStyle,
          backgroundColor: '#6b7280',
          color: 'white'
        }
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
      logger.error('Error loading invoice references:', error)
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
      logger.error('Error loading related data:', error)
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
        // Batch fetch invoices for all entries
        const entryIds = data.map((v: any) => v.id)
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('vehicle_inward_id, paid_amount, balance_amount, total_amount')
          .in('vehicle_inward_id', entryIds)

        // Create a map of vehicle_inward_id → invoice for quick lookup
        const invoicesMap = new Map<string, { paid_amount: number; balance_amount: number; total_amount: number }>()
        if (invoicesData) {
          invoicesData.forEach((inv: any) => {
            invoicesMap.set(inv.vehicle_inward_id, {
              paid_amount: parseFloat(inv.paid_amount || 0),
              balance_amount: parseFloat(inv.balance_amount || 0),
              total_amount: parseFloat(inv.total_amount || 0)
            })
          })
        }

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

          // Get invoice record for this entry
          const invoice = invoicesMap.get(v.id) || null

          // Calculate entry status
          const entryStatus = calculateEntryStatus(invoiceNumber, invoice)

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
            invoiceNumber: invoiceNumber,
            entryStatus: entryStatus
          }
        })

        setCompletedEntries(mappedEntries)
      } else {
        setCompletedEntries([])
      }
    } catch (error) {
      logger.error('Error fetching completed entries:', error)
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
        // Batch fetch invoices for all entries
        const entryIds = data.map((v: any) => v.id)
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('vehicle_inward_id, paid_amount, balance_amount, total_amount')
          .in('vehicle_inward_id', entryIds)

        // Create a map of vehicle_inward_id → invoice for quick lookup
        const invoicesMap = new Map<string, { paid_amount: number; balance_amount: number; total_amount: number }>()
        if (invoicesData) {
          invoicesData.forEach((inv: any) => {
            invoicesMap.set(inv.vehicle_inward_id, {
              paid_amount: parseFloat(inv.paid_amount || 0),
              balance_amount: parseFloat(inv.balance_amount || 0),
              total_amount: parseFloat(inv.total_amount || 0)
            })
          })
        }

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

          // Get invoice record for this entry
          const invoice = invoicesMap.get(v.id) || null

          // Calculate entry status
          const entryStatus = calculateEntryStatus(invoiceNumber, invoice)

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
            invoiceNumber: invoiceNumber,
            entryStatus: entryStatus
          }
        })

        setEntries(mappedEntries)
      } else {
        setEntries([])
      }
    } catch (error) {
      logger.error('Error fetching account entries:', error)
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage)
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = startIndex + entriesPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex)

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
      logger.error('Error saving products:', error)
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
      logger.error('Error adding invoice link:', error)
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
      logger.error('Error uploading invoice:', error)
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
            // Import notification queue dynamically
            const { notificationQueue } = await import('@/lib/notification-queue')
            const result = await notificationQueue.enqueueInvoiceAdded(selectedEntry.id, vehicleData)
            if (result.success) {
              logger.log('[NotificationQueue] ✅ Invoice added notification enqueued:', {
                queueId: result.queueId,
                vehicleId: selectedEntry.id
              })
            } else {
              logger.error('[NotificationQueue] ❌ Failed to enqueue invoice added:', {
                error: result.error,
                vehicleId: selectedEntry.id
              })
            }
          }
        } catch (notifError) {
          logger.error('[NotificationQueue] ❌ Exception enqueueing invoice notification:', notifError)
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
      logger.error('Error updating invoice number:', error)
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
      logger.error('Error updating status:', error)
      alert(`Failed to update status: ${error.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading || invoicesLoading) {
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

        {/* Summary Cards - Financial Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{
            backgroundColor: '#eff6ff',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #bfdbfe'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Invoiced</span>
              <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
              {summary ? `₹${parseFloat(summary.totalInvoiced || 0).toLocaleString('en-IN')}` : 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              All issued invoices
            </div>
          </div>

          <div style={{
            backgroundColor: '#dcfce7',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Total Received</span>
              <DollarSign style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
              {summary ? `₹${parseFloat(summary.totalReceived || 0).toLocaleString('en-IN')}` : 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Payments received
            </div>
          </div>

          <div style={{
            backgroundColor: '#fef3c7',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #fde68a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Outstanding</span>
              <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: '#d97706' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e293b' }}>
              {summary ? `₹${parseFloat(summary.totalOutstanding || 0).toLocaleString('en-IN')}` : 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Unpaid balance
            </div>
          </div>

          <div style={{
            backgroundColor: '#fee2e2',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Overdue</span>
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#dc2626' }}>
              {summary ? `₹${parseFloat(summary.totalOverdue || 0).toLocaleString('en-IN')}` : 'Loading...'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Past due date
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
            onClick={() => setActiveTab('partial')}
            style={{
              padding: '1rem 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'partial' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'partial' ? '600' : '400',
              borderBottom: activeTab === 'partial' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Percent style={{ width: '1rem', height: '1rem' }} />
            Partial Payments
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            style={{
              padding: '1rem 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'overdue' ? '#dc2626' : '#64748b',
              fontWeight: activeTab === 'overdue' ? '600' : '400',
              borderBottom: activeTab === 'overdue' ? '3px solid #dc2626' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <AlertCircle style={{ width: '1rem', height: '1rem', color: activeTab === 'overdue' ? '#dc2626' : undefined }} />
            Overdue
          </button>
          <button
            onClick={() => setActiveTab('settled')}
            style={{
              padding: '1rem 0',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'settled' ? '#059669' : '#64748b',
              fontWeight: activeTab === 'settled' ? '600' : '400',
              borderBottom: activeTab === 'settled' ? '3px solid #059669' : '3px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <CheckCircle style={{ width: '1rem', height: '1rem', color: activeTab === 'settled' ? '#059669' : undefined }} />
            Settled/Completed
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {/* Invoice Status Tabs Content */}
        {['partial', 'overdue', 'settled'].includes(activeTab) && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {/* Search Bar */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
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
                  placeholder="Search by invoice number, customer, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                      // Reset pagination when search changes
                      if (activeTab === 'settled') {
                        setSettledInvoicesPage(1)
                        setSettledEntriesPage(1)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchTerm('')
                        if (activeTab === 'settled') {
                          setSettledInvoicesPage(1)
                          setSettledEntriesPage(1)
                        }
                      }
                  }}
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
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                />
              </div>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      if (activeTab === 'settled') {
                        setSettledInvoicesPage(1)
                        setSettledEntriesPage(1)
                      }
                    }}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                      e.currentTarget.style.color = '#1f2937'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#64748b'
                    }}
                    title="Clear search"
                  >
                    <X style={{ width: '1rem', height: '1rem' }} />
                  </button>
                )}
            </div>
              
              {/* Filter Button with Dropdown */}
              <div style={{ position: 'relative' }} data-filter-dropdown>
                <button
                  onClick={() => {
                    const hasActiveFilter = timeFilter !== 'all' || customStartDate || customEndDate
                    if (hasActiveFilter) {
                      // If filters are active, clear them
                      setTimeFilter('all')
                      setCustomStartDate('')
                      setCustomEndDate('')
                    } else {
                      // Otherwise, toggle dropdown
                      setShowFilterDropdown(!showFilterDropdown)
                    }
                  }}
                  style={{
                    padding: '0.625rem 1rem',
                    backgroundColor: (timeFilter !== 'all' || customStartDate || customEndDate) ? '#eff6ff' : 'white',
                    color: (timeFilter !== 'all' || customStartDate || customEndDate) ? '#2563eb' : '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!(timeFilter !== 'all' || customStartDate || customEndDate)) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(timeFilter !== 'all' || customStartDate || customEndDate)) {
                      e.currentTarget.style.backgroundColor = 'white'
                    }
                  }}
                  title={(timeFilter !== 'all' || customStartDate || customEndDate) ? 'Clear filters' : 'Filter options'}
                >
                  <Filter style={{ width: '1rem', height: '1rem' }} />
                  {(timeFilter !== 'all' || customStartDate || customEndDate) ? 'Clear Filters' : 'Filter'}
                  {(timeFilter !== 'all' || customStartDate || customEndDate) && (
                    <span style={{
                      position: 'absolute',
                      top: '-0.25rem',
                      right: '-0.25rem',
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#2563eb',
                      borderRadius: '50%',
                      border: '2px solid white'
                    }} />
                  )}
                </button>
                
                {/* Filter Dropdown */}
                {showFilterDropdown && !(timeFilter !== 'all' || customStartDate || customEndDate) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      padding: '1rem',
                      minWidth: '280px',
                      zIndex: 1000
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                        Filter by Time Period
                      </div>
                      <select
                        value={timeFilter}
                        onChange={(e) => {
                          setTimeFilter(e.target.value)
                          if (e.target.value !== 'custom') {
                            setCustomStartDate('')
                            setCustomEndDate('')
                            // Close dropdown after a short delay to show the selection
                            const timeoutId = setTimeout(() => setShowFilterDropdown(false), 100)
                            timeoutRefs.current.push(timeoutId)
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.625rem 0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    
                    {timeFilter === 'custom' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.625rem 0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.625rem 0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setShowFilterDropdown(false)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowFilterDropdown(false)
                        }}
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
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Filter Options */}
            {(timeFilter !== 'all' || customStartDate || customEndDate) && (
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Time Period:</span>
                  <select
                    value={timeFilter}
                    onChange={(e) => {
                      setTimeFilter(e.target.value)
                      if (e.target.value !== 'custom') {
                        setCustomStartDate('')
                        setCustomEndDate('')
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {timeFilter === 'custom' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Invoices Table */}
            {invoicesLoading && activeTab !== 'settled' ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading invoices...</div>
            ) : (activeTab === 'settled' && invoicesLoading && completedLoading) ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading settled entries...</div>
            ) : (activeTab === 'settled' && invoices.length === 0 && completedEntries.length === 0) ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No settled invoices or completed entries found
              </div>
            ) : invoices.length === 0 && activeTab !== 'settled' ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No {activeTab} invoices found
              </div>
            ) : invoices.length === 0 && activeTab === 'settled' ? (
              // Don't show empty table for settled tab if there are no invoices
              null
            ) : (() => {
              // Pagination logic for settled tab
              const settledInvoicesToShow = activeTab === 'settled' ? (() => {
                const startIndex = (settledInvoicesPage - 1) * entriesPerPage
                const endIndex = startIndex + entriesPerPage
                return invoices.slice(startIndex, endIndex)
              })() : invoices
              
              const totalPages = activeTab === 'settled' ? Math.ceil(invoices.length / entriesPerPage) : 1
              const startIndex = activeTab === 'settled' ? (settledInvoicesPage - 1) * entriesPerPage : 0
              const endIndex = activeTab === 'settled' ? startIndex + entriesPerPage : invoices.length
              
              return (
              <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Invoice #</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Vehicle</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Invoice Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Due Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Paid</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Balance</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {settledInvoicesToShow.map((invoice: any) => {
                      const vehicle = invoice.vehicle_inward?.vehicles
                      const customer = vehicle?.customers
                      const statusColors: Record<string, string> = {
                        draft: '#64748b',
                        issued: '#3b82f6',
                        partial: '#f59e0b',
                        paid: '#10b981',
                        overdue: '#ef4444',
                        cancelled: '#94a3b8'
                      }
                      return (
                        <tr key={invoice.id} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          onClick={() => setSelectedInvoice(invoice.id)}
                        >
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600' }}>
                            {invoice.invoice_number || 'Draft'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            {customer?.name || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            {vehicle?.registration_number || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            {invoice.due_date ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>
                                  {new Date(invoice.due_date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                                {new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' && (
                                  <AlertCircle style={{ width: '0.875rem', height: '0.875rem', color: '#dc2626' }} title="Overdue" />
                                )}
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: statusColors[invoice.status] || '#94a3b8',
                              color: 'white',
                              textTransform: 'capitalize',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              {invoice.status === 'overdue' && <AlertCircle style={{ width: '0.75rem', height: '0.75rem' }} />}
                              {invoice.status === 'paid' && <CheckCircle style={{ width: '0.75rem', height: '0.75rem' }} />}
                              {invoice.status === 'partial' && <Clock style={{ width: '0.75rem', height: '0.75rem' }} />}
                              {invoice.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                            ₹{parseFloat(invoice.total_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', color: '#10b981' }}>
                            ₹{parseFloat(invoice.paid_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>
                            ₹{parseFloat(invoice.balance_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedInvoice(invoice.id)
                              }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye style={{ width: '0.875rem', height: '0.875rem', display: 'inline' }} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
                
                {/* Pagination for Settled Invoices */}
                {activeTab === 'settled' && invoices.length > 0 && totalPages > 1 && (
                  <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      Showing {startIndex + 1} to {Math.min(endIndex, invoices.length)} of {invoices.length} invoices
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSettledInvoicesPage(prev => Math.max(1, prev - 1))}
                        disabled={settledInvoicesPage === 1}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: settledInvoicesPage === 1 ? '#f3f4f6' : 'white',
                          color: settledInvoicesPage === 1 ? '#9ca3af' : '#374151',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: settledInvoicesPage === 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (settledInvoicesPage <= 3) {
                          pageNum = i + 1
                        } else if (settledInvoicesPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = settledInvoicesPage - 2 + i
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setSettledInvoicesPage(pageNum)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: settledInvoicesPage === pageNum ? '#2563eb' : 'white',
                              color: settledInvoicesPage === pageNum ? 'white' : '#374151',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              fontWeight: settledInvoicesPage === pageNum ? '600' : '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (settledInvoicesPage !== pageNum) {
                                e.currentTarget.style.backgroundColor = '#f9fafb'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (settledInvoicesPage !== pageNum) {
                                e.currentTarget.style.backgroundColor = 'white'
                              }
                            }}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setSettledInvoicesPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={settledInvoicesPage === totalPages}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: settledInvoicesPage === totalPages ? '#f3f4f6' : 'white',
                          color: settledInvoicesPage === totalPages ? '#9ca3af' : '#374151',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: settledInvoicesPage === totalPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </div>
              </div>
            )}
              </>
              )
            })()}

            {/* Completed Entries Section (for Settled/Completed tab) */}
            {activeTab === 'settled' && (() => {
              // Filter out entries that already have settled invoices (to avoid duplication)
              const entriesWithoutSettledInvoices = completedEntries.filter(entry => 
                !invoices.some((inv: any) => inv.vehicle_inward_id === entry.id)
              )
              return entriesWithoutSettledInvoices.length > 0 && (
                <div style={{ marginTop: '2rem', borderTop: '2px solid #e2e8f0', paddingTop: '2rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                    Completed Entries ({(() => {
                      const filtered = entriesWithoutSettledInvoices.filter(entry => {
                        if (!searchTerm) return true
                        const searchLower = searchTerm.toLowerCase()
                        return (
                          entry.customerName.toLowerCase().includes(searchLower) ||
                          entry.vehicleNumber.toLowerCase().includes(searchLower) ||
                          entry.shortId?.toLowerCase().includes(searchLower) ||
                          entry.invoiceNumber?.toLowerCase().includes(searchLower)
                        )
                      })
                      return filtered.length
                    })()})
                  </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Entry ID</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Vehicle</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Completed Date</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Amount</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Apply search filter
                        const filteredEntries = entriesWithoutSettledInvoices.filter(entry => {
                          if (!searchTerm) return true
                          const searchLower = searchTerm.toLowerCase()
                          return (
                            entry.customerName.toLowerCase().includes(searchLower) ||
                            entry.vehicleNumber.toLowerCase().includes(searchLower) ||
                            entry.shortId?.toLowerCase().includes(searchLower) ||
                            entry.invoiceNumber?.toLowerCase().includes(searchLower)
                          )
                        })
                        
                        // Apply pagination
                        const startIndex = (settledEntriesPage - 1) * entriesPerPage
                        const endIndex = startIndex + entriesPerPage
                        return filteredEntries.slice(startIndex, endIndex)
                      })().map((entry) => (
                        <tr
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            backgroundColor: selectedEntry?.id === entry.id ? '#eff6ff' : 'white'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedEntry?.id !== entry.id) {
                              e.currentTarget.style.backgroundColor = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedEntry?.id !== entry.id) {
                              e.currentTarget.style.backgroundColor = 'white'
                            }
                          }}
                        >
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#059669',
                              color: 'white',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {entry.shortId || entry.id.substring(0, 8)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '500' }}>
                            {entry.customerName}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                            {entry.model} ({entry.vehicleNumber})
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                            {formatDate(entry.completed_at || entry.installationCompleteDate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={getStatusBadgeStyle(entry.entryStatus || 'Na')}>
                              {entry.entryStatus || 'Na'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>
                            {formatCurrency(entry.finalAmount || entry.totalAmount)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEntry(entry)
                              }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye style={{ width: '0.875rem', height: '0.875rem', display: 'inline' }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination for Completed Entries */}
                {(() => {
                  const filteredEntries = entriesWithoutSettledInvoices.filter(entry => {
                    if (!searchTerm) return true
                    const searchLower = searchTerm.toLowerCase()
                    return (
                      entry.customerName.toLowerCase().includes(searchLower) ||
                      entry.vehicleNumber.toLowerCase().includes(searchLower) ||
                      entry.shortId?.toLowerCase().includes(searchLower) ||
                      entry.invoiceNumber?.toLowerCase().includes(searchLower)
                    )
                  })
                  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage)
                  const startIndex = (settledEntriesPage - 1) * entriesPerPage
                  const endIndex = startIndex + entriesPerPage
                  
                  return totalPages > 1 && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => setSettledEntriesPage(prev => Math.max(1, prev - 1))}
                          disabled={settledEntriesPage === 1}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: settledEntriesPage === 1 ? '#f3f4f6' : 'white',
                            color: settledEntriesPage === 1 ? '#9ca3af' : '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: settledEntriesPage === 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (settledEntriesPage <= 3) {
                            pageNum = i + 1
                          } else if (settledEntriesPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = settledEntriesPage - 2 + i
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setSettledEntriesPage(pageNum)}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: settledEntriesPage === pageNum ? '#2563eb' : 'white',
                                color: settledEntriesPage === pageNum ? 'white' : '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: settledEntriesPage === pageNum ? '600' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (settledEntriesPage !== pageNum) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (settledEntriesPage !== pageNum) {
                                  e.currentTarget.style.backgroundColor = 'white'
                                }
                              }}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setSettledEntriesPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={settledEntriesPage === totalPages}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: settledEntriesPage === totalPages ? '#f3f4f6' : 'white',
                            color: settledEntriesPage === totalPages ? '#9ca3af' : '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: settledEntriesPage === totalPages ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
            })()}
          </div>
        )}

        {/* Legacy Tabs - Keep for backward compatibility */}
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

            {/* Entries Table */}
            <div style={{ overflowX: 'auto' }}>
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
                <>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Entry ID</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Customer</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Vehicle</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Completion Date</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Amount</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            backgroundColor: selectedEntry?.id === entry.id ? '#eff6ff' : 'white',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedEntry?.id !== entry.id) {
                              e.currentTarget.style.backgroundColor = '#f8fafc'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedEntry?.id !== entry.id) {
                              e.currentTarget.style.backgroundColor = 'white'
                            }
                          }}
                        >
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#059669',
                              color: 'white',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}>
                              {entry.shortId || entry.id.substring(0, 8)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>
                            {entry.customerName}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                            {entry.model} ({entry.vehicleNumber})
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>
                            {formatDate(entry.installationCompleteDate)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={getStatusBadgeStyle(entry.entryStatus || 'Na')}>
                              {entry.entryStatus || 'Na'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>
                            {formatCurrency(entry.totalAmount)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEntry(entry)
                              }}
                              style={{
                                padding: '0.375rem 0.75rem',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                            >
                              <Eye style={{ width: '0.875rem', height: '0.875rem' }} />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                            color: currentPage === 1 ? '#9ca3af' : '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Previous
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: currentPage === pageNum ? '#2563eb' : 'white',
                                  color: currentPage === pageNum ? 'white' : '#374151',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  fontWeight: currentPage === pageNum ? '600' : '500',
                                  cursor: 'pointer',
                                  minWidth: '2.5rem',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  if (currentPage !== pageNum) {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (currentPage !== pageNum) {
                                    e.currentTarget.style.backgroundColor = 'white'
                                  }
                                }}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                            color: currentPage === totalPages ? '#9ca3af' : '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
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
            backgroundColor: 'white',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              width: '100%',
              height: '100%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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

            {/* Responsive Styles */}
            <style>{`
              @media (max-width: 1200px) {
                .account-details-grid {
                  grid-template-columns: 1fr !important;
                }
              }
              @media (max-width: 768px) {
                .account-details-grid {
                  padding: 1.5rem !important;
                  gap: 1.5rem !important;
                }
              }
            `}</style>
            
            {/* Modal Content */}
            <div 
              className="account-details-grid"
              style={{ 
                padding: '2rem', 
                flex: 1, 
                overflow: 'auto',
                maxWidth: '1600px',
                margin: '0 auto',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: '1.5rem',
                alignItems: 'start'
              }}
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Customer & Vehicle Information - Merged */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                  Customer & Vehicle Information
                </h3>
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem', 
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Customer Name</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.customerName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Phone</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.customerPhone}</div>
                    </div>
                      <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Vehicle Number</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.vehicleNumber}</div>
                      </div>
              <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Model</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.model}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Make</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.make}</div>
                    </div>
                    {selectedEntry.color && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Color</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.color}</div>
                      </div>
                    )}
                    {selectedEntry.vehicleType && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Vehicle Type</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>
                          {vehicleTypeNames.get(selectedEntry.vehicleType) || selectedEntry.vehicleType}
                        </div>
                      </div>
                    )}
                    {selectedEntry.customerEmail && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Email</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>{selectedEntry.customerEmail}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Installation Details */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                  Installation Details
                </h3>
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem', 
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {selectedEntry.manager && (
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Assigned Manager</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>
                          {managerNames.get(selectedEntry.manager) || selectedEntry.manager}
                        </div>
                      </div>
                    )}
                    {selectedEntry.location && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Location</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>
                          {locationNames.get(selectedEntry.location) || selectedEntry.location}
                        </div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Installation Complete Date</div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>
                        {formatDate(selectedEntry.installationCompleteDate)}
                      </div>
                    </div>
                    {selectedEntry.expectedDelivery && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: '500' }}>Expected Delivery</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: '400', color: '#111827' }}>
                          {new Date(selectedEntry.expectedDelivery).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Details with Prices - Editable */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Package style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
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
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                      <Edit2 style={{ width: '0.875rem', height: '0.875rem' }} />
                      Edit Products
                    </button>
                  )}
                </div>
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem', 
                  border: '1px solid #e5e7eb', 
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>
                          Product
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>
                          Brand
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>
                          Department
                        </th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>
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
                                    fontSize: '0.8125rem'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: '400' }}>
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
                                    fontSize: '0.8125rem'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
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
                                    fontSize: '0.8125rem',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  {Array.from(departmentNames.entries()).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
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
                                    fontSize: '0.8125rem',
                                    textAlign: 'right'
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#059669' }}>
                                  {formatCurrency(product.price)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.8125rem' }}>
                            No products listed
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                      <tr>
                        <td colSpan={3} style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', textAlign: 'right' }}>
                          Subtotal:
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '700', color: '#059669', textAlign: 'right' }}>
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

              {/* Payments details Section - Moved to Right Column (see right column) */}
              {/* Note: Payment Details, Invoice Number, and Invoice References have been moved to the right column for better layout */}



              {/* Comments and Attachments - Collapsible */}
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                overflow: 'hidden'
              }}>
                {/* Collapsible Header */}
                <button
                  onClick={() => setCommentsExpanded(!commentsExpanded)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                      Comments & Attachments
                    </span>
                  </div>
                  {commentsExpanded ? (
                    <ChevronUp style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                  ) : (
                    <ChevronDown style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                  )}
                </button>
                
                {/* Collapsible Content */}
                {commentsExpanded && (
                  <div style={{
                    padding: '0.75rem',
                    maxHeight: '500px',
                    overflowY: 'auto',
                    borderTop: '1px solid #e5e7eb',
                    transition: 'all 0.3s ease'
                  }}>
                    <VehicleCommentsSection vehicleId={selectedEntry.id} userRole={userRole} />
                  </div>
                )}
              </div>
              </div>

              {/* Right Column - Sticky */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem',
                position: 'sticky',
                top: '1rem',
                alignSelf: 'start',
                maxHeight: 'calc(100vh - 2rem)',
                overflowY: 'auto'
              }}>
                {/* Order Summary Card - Sticky at Top */}
                {selectedEntry && (() => {
                  const subtotal = selectedEntry.products.reduce((sum, p) => sum + p.price, 0)
                  const discount = selectedInvoiceForPayment?.discount_amount || (selectedEntry.notes ? (() => {
                    try {
                      const notes = typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes
                      return notes.discount?.discount_amount || 0
                    } catch {
                      return 0
                    }
                  })() : 0)
                  const tax = parseFloat(selectedInvoiceForPayment?.tax_amount || 0)
                  const total = subtotal - discount + tax
                  
                  return (
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem' }}>
                        Order Summary
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Subtotal:</span>
                          <span style={{ fontWeight: '500', color: '#1e293b' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {discount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                            <span>Discount:</span>
                            <span style={{ fontWeight: '500' }}>-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {tax > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                            <span>Tax:</span>
                            <span style={{ fontWeight: '500', color: '#1e293b' }}>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: '700', color: '#0c4a6e' }}>
                          <span>Total:</span>
                          <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Invoice Section */}
              <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText style={{ width: '0.875rem', height: '0.875rem' }} />
                    Invoice
                </h3>
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    padding: '1rem', 
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {(userRole === 'admin' || userRole === 'accountant') ? (
                      editingInvoiceNumber ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={invoiceNumberInput}
                            onChange={(e) => setInvoiceNumberInput(e.target.value)}
                            placeholder="Invoice number"
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem'
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
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={handleInvoiceNumberUpdate}
                              disabled={updatingInvoiceNumber}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                backgroundColor: '#0284c7',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: updatingInvoiceNumber ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {updatingInvoiceNumber ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingInvoiceNumber(false)
                                setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
                              }}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Invoice Number</div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: selectedEntry.invoiceNumber ? '#0c4a6e' : '#9ca3af' }}>
                              {selectedEntry.invoiceNumber || 'Not set'}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingInvoiceNumber(true)
                              setInvoiceNumberInput(selectedEntry.invoiceNumber || '')
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#0284c7',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Edit2 style={{ width: '0.75rem', height: '0.75rem' }} />
                            {selectedEntry.invoiceNumber ? 'Edit' : 'Add'}
                          </button>
                        </div>
                      )
                    ) : (
                      selectedEntry.invoiceNumber && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Invoice Number</div>
                          <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#0c4a6e' }}>
                            {selectedEntry.invoiceNumber}
                          </div>
                        </div>
                      )
                    )}
                    
                    {/* Invoice URL and PDF Upload Section - Collapsible Dropdown */}
                    {(userRole === 'admin' || userRole === 'accountant') && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                        {/* Dropdown Header */}
                        <button
                          onClick={() => setShowInvoiceSection(!showInvoiceSection)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '0.375rem',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                            Invoice Management
                            {invoiceReferences.length > 0 && (
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: '#64748b', 
                                fontWeight: 'normal',
                                backgroundColor: '#e5e7eb',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '0.75rem'
                              }}>
                                {invoiceReferences.length} {invoiceReferences.length === 1 ? 'reference' : 'references'}
                              </span>
                            )}
                          </div>
                          {showInvoiceSection ? (
                            <ChevronUp style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                          ) : (
                            <ChevronDown style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                          )}
                        </button>

                        {/* Collapsible Content */}
                        {showInvoiceSection && (
                          <div style={{ marginTop: '0.75rem' }}>
                            {/* Add Invoice URL */}
                            <div style={{ marginBottom: '0.75rem' }}>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Add Invoice URL
                              </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="url"
                              value={invoiceLink}
                              onChange={(e) => setInvoiceLink(e.target.value)}
                              placeholder="https://example.com/invoice.pdf"
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.8125rem',
                                outline: 'none'
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && invoiceLink.trim()) {
                                  handleAddInvoiceLink()
                                }
                              }}
                            />
                            <button
                              onClick={handleAddInvoiceLink}
                              disabled={!invoiceLink.trim() || invoiceLoading}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: invoiceLink.trim() && !invoiceLoading ? '#0284c7' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: invoiceLink.trim() && !invoiceLoading ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <LinkIcon style={{ width: '0.75rem', height: '0.75rem' }} />
                              {invoiceLoading ? 'Adding...' : 'Add URL'}
                            </button>
                          </div>
                        </div>
                        
                        {/* Upload Invoice PDF */}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Upload Invoice PDF
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label
                              htmlFor="invoice-pdf-upload"
                              onClick={(e) => {
                                if (invoiceFile) {
                                  e.preventDefault()
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px dashed #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                backgroundColor: '#f9fafb',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: invoiceFile ? '#059669' : '#64748b',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (!invoiceFile) {
                                  e.currentTarget.style.borderColor = '#3b82f6'
                                  e.currentTarget.style.backgroundColor = '#eff6ff'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!invoiceFile) {
                                  e.currentTarget.style.borderColor = '#d1d5db'
                                  e.currentTarget.style.backgroundColor = '#f9fafb'
                                }
                              }}
                            >
                              <Upload style={{ width: '0.875rem', height: '0.875rem' }} />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {invoiceFile ? invoiceFile.name : 'Choose PDF file...'}
                              </span>
                              {invoiceFile && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setInvoiceFile(null)
                                    // Reset file input
                                    const fileInput = document.getElementById('invoice-pdf-upload') as HTMLInputElement
                                    if (fileInput) {
                                      fileInput.value = ''
                                    }
                                  }}
                                  style={{
                                    padding: '0.25rem',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#dc2626'
                                  }}
                                >
                                  <X style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                              )}
                            </label>
                            <input
                              id="invoice-pdf-upload"
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                                    setInvoiceFile(file)
                                  } else {
                                    alert('Please select a PDF file')
                                    e.target.value = ''
                                  }
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                            <button
                              onClick={handleUploadInvoice}
                              disabled={!invoiceFile || invoiceLoading}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: invoiceFile && !invoiceLoading ? '#059669' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: invoiceFile && !invoiceLoading ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <FileImage style={{ width: '0.75rem', height: '0.75rem' }} />
                              {invoiceLoading ? 'Uploading...' : 'Upload'}
                            </button>
                          </div>
                        </div>
                        
                            {/* Display Invoice References */}
                            {invoiceReferences.length > 0 && (
                              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>
                                  Invoice References ({invoiceReferences.length})
                                </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {invoiceReferences.map((ref, index) => (
                                <div
                                  key={index}
                                  style={{
                                    padding: '0.5rem',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e5e7eb',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.8125rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                    {ref.type === 'link' ? (
                                      <LinkIcon style={{ width: '0.875rem', height: '0.875rem', color: '#2563eb', flexShrink: 0 }} />
                                    ) : (
                                      <FileImage style={{ width: '0.875rem', height: '0.875rem', color: '#059669', flexShrink: 0 }} />
                                    )}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {ref.type === 'link' ? (
                                        <a
                                          href={ref.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#2563eb', textDecoration: 'none' }}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {ref.url}
                                        </a>
                                      ) : (
                                        ref.fileName || 'Invoice File'
                                      )}
                                    </span>
                                  </div>
                                  {ref.type === 'file' && (
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#eff6ff',
                                        color: '#2563eb',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.75rem',
                                        textDecoration: 'none',
                                        fontWeight: '500',
                                        marginLeft: '0.5rem',
                                        flexShrink: 0
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Discount Section */}
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Percent style={{ width: '0.875rem', height: '0.875rem', color: '#d97706' }} />
                    Discount
                  </h3>
                  <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    padding: '1rem', 
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {!editingDiscount ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          {(() => {
                            const currentDiscount = selectedInvoiceForPayment?.discount_amount || 
                              (selectedEntry?.notes ? (() => {
                                try {
                                  const notes = typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes
                                  return notes.discount?.discount_amount || 0
                                } catch {
                                  return 0
                                }
                              })() : 0)
                            return currentDiscount > 0 ? (
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Amount</div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#dc2626' }}>
                                  -₹{parseFloat(currentDiscount.toString()).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>No discount</div>
                            )
                          })()}
                        </div>
                      <button
                        onClick={() => {
                          setEditingDiscount(true)
                          if (selectedInvoiceForPayment) {
                            setDiscountAmount((selectedInvoiceForPayment.discount_amount || 0).toString())
                            setDiscountOfferedBy('')
                            setDiscountReason(selectedInvoiceForPayment.discount_reason || '')
                          } else if (selectedEntry) {
                            try {
                              const notes = selectedEntry.notes ? (typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes) : {}
                              const discountData = notes.discount || {}
                              setDiscountAmount((discountData.discount_amount || 0).toString())
                              setDiscountOfferedBy(discountData.discount_offered_by || '')
                              setDiscountReason(discountData.discount_reason || '')
                            } catch {
                              setDiscountAmount('')
                              setDiscountOfferedBy('')
                              setDiscountReason('')
                            }
                          }
                        }}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: 'none',
                          borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                          <Edit2 style={{ width: '0.75rem', height: '0.75rem' }} />
                        {(() => {
                          const currentDiscount = selectedInvoiceForPayment?.discount_amount || 
                            (selectedEntry?.notes ? (() => {
                              try {
                                const notes = typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes
                                return notes.discount?.discount_amount || 0
                              } catch {
                                return 0
                              }
                            })() : 0)
                            return currentDiscount > 0 ? 'Edit' : 'Add'
                        })()}
                      </button>
                  </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#92400e', marginBottom: '0.25rem', display: 'block' }}>
                            Amount (Rs.)
                        </label>
                        <input
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          min="0"
                          step="0.01"
                            placeholder="Enter discount"
                          style={{
                            width: '100%',
                              padding: '0.5rem',
                            border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem'
                          }}
                        />
                      </div>
                      <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#92400e', marginBottom: '0.25rem', display: 'block' }}>
                            Reason
                        </label>
                        <textarea
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                            placeholder="Reason for discount"
                            rows={2}
                          style={{
                            width: '100%',
                              padding: '0.5rem',
                            border: '1px solid #d1d5db',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setEditingDiscount(false)
                            setDiscountAmount('')
                            setDiscountOfferedBy('')
                            setDiscountReason('')
                          }}
                          style={{
                              padding: '0.5rem 0.75rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                            fontWeight: '500',
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
                              const discount = parseFloat(discountAmount || '0')
                              
                              if (selectedInvoiceForPayment) {
                                const subtotal = selectedEntry.products.reduce((sum, p) => sum + p.price, 0) || parseFloat(selectedInvoiceForPayment.total_amount || 0)
                                const tax = parseFloat(selectedInvoiceForPayment.tax_amount || 0)
                                const newTotal = subtotal - discount + tax
                                
                                const tenantId = getCurrentTenantId()
                                const isSuper = isSuperAdmin()
                                
                                let invoiceUpdateQuery = supabase
                                  .from('invoices')
                                  .update({
                                    discount_amount: discount,
                                    discount_reason: discountReason,
                                    total_amount: newTotal,
                                    balance_amount: newTotal - parseFloat(selectedInvoiceForPayment.paid_amount || 0)
                                  })
                                  .eq('id', selectedInvoiceForPayment.id)
                                
                                if (!isSuper && tenantId) {
                                  invoiceUpdateQuery = invoiceUpdateQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { error } = await invoiceUpdateQuery
                                
                                if (error) throw error
                                
                                let invoiceFetchQuery = supabase
                                  .from('invoices')
                                  .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
                                  .eq('id', selectedInvoiceForPayment.id)
                                
                                if (!isSuper && tenantId) {
                                  invoiceFetchQuery = invoiceFetchQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { data: updatedInvoice, error: fetchError } = await invoiceFetchQuery.maybeSingle()
                                
                                if (fetchError && fetchError.code !== 'PGRST116') {
                                  logger.error('Error fetching updated invoice:', fetchError)
                                }
                                
                                if (updatedInvoice) {
                                  setSelectedInvoiceForPayment(updatedInvoice)
                                  // Also sync discount to selectedEntry.notes to keep both sources in sync
                                  // This ensures consistent display whether checking invoice or notes
                                  if (selectedEntry) {
                                    try {
                                      let notesData: any = {}
                                      if (selectedEntry.notes) {
                                        try {
                                          notesData = typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes
                                        } catch {
                                          notesData = {}
                                        }
                                      }
                                      
                                      // Update discount in notes to match invoice
                                      if (!notesData.discount) {
                                        notesData.discount = {}
                                      }
                                      notesData.discount.discount_amount = discount
                                      notesData.discount.discount_reason = discountReason
                                      
                                      const updatedEntryWithNotes = {
                                        ...selectedEntry,
                                        discountAmount: discount,
                                        discountReason: discountReason,
                                        notes: JSON.stringify(notesData)
                                      }
                                      setSelectedEntry(updatedEntryWithNotes)
                                    } catch (syncError) {
                                      logger.error('Error syncing discount to entry notes:', syncError)
                                      // Don't fail the operation, just log
                                    }
                                  }
                                  alert('Discount saved successfully!')
                                } else {
                                  alert('Discount saved, but could not refresh invoice data. Please refresh the page.')
                                }
                              } else {
                                const discountPercentage = selectedEntry.totalAmount > 0 ? (discount / selectedEntry.totalAmount) * 100 : 0
                                const discountData = {
                                  discount_amount: discount,
                                  discount_percentage: discountPercentage,
                                  discount_offered_by: discountOfferedBy,
                                  discount_reason: discountReason
                                }
                                
                                const tenantId = getCurrentTenantId()
                                const isSuper = isSuperAdmin()
                                
                                let notesQuery = supabase
                                  .from('vehicle_inward')
                                  .select('notes')
                                  .eq('id', selectedEntry.id)
                                
                                if (!isSuper && tenantId) {
                                  notesQuery = notesQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { data: existing, error: notesError } = await notesQuery.maybeSingle()
                                
                                if (notesError && notesError.code !== 'PGRST116') {
                                  throw notesError
                                }
                                
                                let notesData: any = {}
                                if (existing?.notes) {
                                  try {
                                    notesData = typeof existing.notes === 'string' ? JSON.parse(existing.notes) : existing.notes
                                  } catch {
                                    notesData = {}
                                  }
                                }
                                
                                notesData.discount = discountData
                                
                                let updateNotesQuery = supabase
                                  .from('vehicle_inward')
                                  .update({ notes: JSON.stringify(notesData) })
                                  .eq('id', selectedEntry.id)
                                
                                // Apply tenant filter for security
                                if (!isSuper && tenantId) {
                                  updateNotesQuery = updateNotesQuery.eq('tenant_id', tenantId)
                                }
                                
                                const { error } = await updateNotesQuery
                                
                                if (error) throw error
                                
                                const updatedEntry = {
                                  ...selectedEntry,
                                  discountAmount: discount,
                                  discountPercentage: discountPercentage,
                                  discountOfferedBy: discountOfferedBy,
                                  discountReason: discountReason,
                                  finalAmount: selectedEntry.totalAmount - discount,
                                  notes: JSON.stringify(notesData)
                                }
                                setSelectedEntry(updatedEntry)
                                
                                // If invoice exists, also update invoice discount to keep them in sync
                                if (selectedInvoiceForPayment) {
                                  const subtotal = selectedEntry.products.reduce((sum, p) => sum + p.price, 0) || parseFloat(selectedInvoiceForPayment.total_amount || 0)
                                  const tax = parseFloat(selectedInvoiceForPayment.tax_amount || 0)
                                  const newTotal = subtotal - discount + tax
                                  
                                  // Sync discount to invoice with tenant filtering
                                  const syncTenantId = getCurrentTenantId()
                                  const syncIsSuper = isSuperAdmin()
                                  
                                  let invoiceSyncUpdateQuery = supabase
                                    .from('invoices')
                                    .update({
                                      discount_amount: discount,
                                      discount_reason: discountReason,
                                      total_amount: newTotal,
                                      balance_amount: newTotal - parseFloat(selectedInvoiceForPayment.paid_amount || 0)
                                    })
                                    .eq('id', selectedInvoiceForPayment.id)
                                  
                                  if (!syncIsSuper && syncTenantId) {
                                    invoiceSyncUpdateQuery = invoiceSyncUpdateQuery.eq('tenant_id', syncTenantId)
                                  }
                                  
                                  const { error: invoiceUpdateError } = await invoiceSyncUpdateQuery
                                  
                                  if (invoiceUpdateError) {
                                    logger.error('Error syncing discount to invoice:', invoiceUpdateError)
                                    // Don't fail the whole operation, just log the error
                                  } else {
                                    // Refresh invoice to get updated data with tenant filtering
                                    let invoiceRefreshQuery = supabase
                                      .from('invoices')
                                      .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
                                      .eq('id', selectedInvoiceForPayment.id)
                                    
                                    if (!syncIsSuper && syncTenantId) {
                                      invoiceRefreshQuery = invoiceRefreshQuery.eq('tenant_id', syncTenantId)
                                    }
                                    
                                    const { data: refreshedInvoice } = await invoiceRefreshQuery.maybeSingle()
                                    
                                    if (refreshedInvoice) {
                                      setSelectedInvoiceForPayment(refreshedInvoice)
                                    }
                                  }
                                }
                                
                                alert('Discount information saved successfully!')
                              }
                              
                              setEditingDiscount(false)
                            } catch (error: any) {
                              logger.error('Error saving discount:', error)
                              alert(`Failed to save discount: ${error.message}`)
                            } finally {
                              setSavingDiscount(false)
                            }
                          }}
                          disabled={savingDiscount}
                          style={{
                              padding: '0.5rem 0.75rem',
                            backgroundColor: savingDiscount ? '#9ca3af' : '#059669',
                            color: 'white',
                            border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: savingDiscount ? 'not-allowed' : 'pointer'
                          }}
                        >
                            <Save style={{ width: '0.75rem', height: '0.75rem', display: 'inline', marginRight: '0.25rem' }} />
                            {savingDiscount ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

                {/* Payment Details - Compact */}
                {selectedInvoiceForPayment ? (
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                      Payment Status
                    </h3>
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.5rem', 
                      padding: '1rem', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      {(() => {
                        const subtotal = selectedEntry?.products.reduce((sum, p) => sum + p.price, 0) || parseFloat(selectedInvoiceForPayment.total_amount || 0)
                        const discount = parseFloat(selectedInvoiceForPayment.discount_amount || 0)
                        const tax = parseFloat(selectedInvoiceForPayment.tax_amount || 0)
                        const total = subtotal - discount + tax
                        const paid = parseFloat(selectedInvoiceForPayment.paid_amount || 0)
                        const balance = total - paid
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: '600' }}>
                              <span>Paid:</span>
                              <span>₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: balance > 0 ? '#dc2626' : '#059669', fontWeight: '600' }}>
                              <span>Balance:</span>
                                  <span>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', overflow: 'hidden', marginTop: '0.25rem' }}>
                                <div 
                                  style={{ 
                                    width: `${total > 0 ? (paid / total) * 100 : 0}%`,
                                    height: '100%',
                                    backgroundColor: balance > 0 ? '#f59e0b' : '#10b981',
                                    transition: 'width 0.3s ease'
                                  }}
                                />
                              </div>
                            {/* Due Date Section - Show when there's a balance */}
                            {balance > 0 && selectedInvoiceForPayment.due_date && (
                              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                                {!editingDueDate ? (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div>
                                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Due Date</div>
                                      <div style={{ fontSize: '0.8125rem', fontWeight: '500', color: '#111827' }}>
                                        {new Date(selectedInvoiceForPayment.due_date).toLocaleDateString('en-IN', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric'
                                        })}
                                      </div>
                                    </div>
                                    {(userRole === 'admin' || userRole === 'accountant') && (
                                      <button
                                        onClick={() => {
                                          setEditingDueDate(true)
                                          setNextPaymentDueDate(selectedInvoiceForPayment.due_date || '')
                                        }}
                                        style={{
                                          padding: '0.375rem 0.75rem',
                                          backgroundColor: '#0284c7',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0.375rem',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem'
                                        }}
                                      >
                                        <Edit2 style={{ width: '0.75rem', height: '0.75rem' }} />
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '500', color: '#64748b' }}>
                                      Due Date
                                    </label>
                                    <input
                                      type="date"
                                      value={nextPaymentDueDate}
                                      onChange={(e) => setNextPaymentDueDate(e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.8125rem'
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button
                                        onClick={async () => {
                                          if (!selectedInvoiceForPayment || !nextPaymentDueDate) return
                                          try {
                                            const tenantId = getCurrentTenantId()
                                            const isSuper = isSuperAdmin()
                                            
                                            let updateQuery = supabase
                                              .from('invoices')
                                              .update({ due_date: nextPaymentDueDate })
                                              .eq('id', selectedInvoiceForPayment.id)
                                            
                                            if (!isSuper && tenantId) {
                                              updateQuery = updateQuery.eq('tenant_id', tenantId)
                                            }
                                            
                                            const { error } = await updateQuery
                                            
                                            if (error) throw error
                                            
                                            let fetchQuery = supabase
                                              .from('invoices')
                                              .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
                                              .eq('id', selectedInvoiceForPayment.id)
                                            
                                            if (!isSuper && tenantId) {
                                              fetchQuery = fetchQuery.eq('tenant_id', tenantId)
                                            }
                                            
                                            const { data: updatedInvoice } = await fetchQuery.maybeSingle()
                                            
                                            if (updatedInvoice) {
                                              setSelectedInvoiceForPayment(updatedInvoice)
                                              setEditingDueDate(false)
                                              alert('Due date updated successfully!')
                                            } else {
                                              alert('Due date updated, but could not refresh invoice data. Please refresh the page.')
                                            }
                                          } catch (error: any) {
                                            logger.error('Error updating due date:', error)
                                            alert(`Failed to update due date: ${error.message}`)
                                          }
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: '0.5rem',
                                          backgroundColor: '#0284c7',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '0.375rem',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingDueDate(false)
                                          setNextPaymentDueDate(selectedInvoiceForPayment.due_date || '')
                                        }}
                                        style={{
                                          padding: '0.5rem',
                                          backgroundColor: '#f3f4f6',
                                          color: '#374151',
                                          border: 'none',
                                          borderRadius: '0.375rem',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {balance > 0 && (
                              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                        <button
                                  onClick={() => setShowPaymentModal(true)}
                          style={{
                                    width: '100%',
                                    padding: '0.625rem',
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.375rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                                  Add Payment
                            </button>
                          </div>
                            )}
                          </div>
                        )
                      })()}
                      </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                      Payment Status
                    </h3>
                    <div style={{ 
                      backgroundColor: 'white', 
                      borderRadius: '0.5rem', 
                      padding: '1rem', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: '500' }}>
                          <span>Paid:</span>
                          <span>₹0.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontWeight: '500' }}>
                          <span>Balance:</span>
                          <span>₹{selectedEntry?.products.reduce((sum, p) => sum + p.price, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                            <button
                              onClick={async () => {
                              if (!selectedEntry) return
                                
                              // Validate that there are products with valid prices
                              if (!selectedEntry.products || selectedEntry.products.length === 0) {
                                alert('Cannot create invoice: No products found for this entry. Please add products first.')
                                  return
                                }
                                
                              const validProducts = selectedEntry.products.filter(p => {
                                const price = parseFloat(p.price) || 0
                                return price > 0
                              })
                              
                              if (validProducts.length === 0) {
                                alert('Cannot create invoice: No products with valid prices found. Please ensure all products have prices greater than 0.')
                                return
                              }
                              
                              // First, create invoice if it doesn't exist
                              if (!selectedInvoiceForPayment) {
                        setCreatingInvoice(true)
                        try {
                          let discountFromNotes = 0
                          let discountReasonFromNotes = ''
                          try {
                            if (selectedEntry.notes) {
                              const notes = typeof selectedEntry.notes === 'string' ? JSON.parse(selectedEntry.notes) : selectedEntry.notes
                              discountFromNotes = notes.discount?.discount_amount || 0
                              discountReasonFromNotes = notes.discount?.discount_reason || ''
                            }
                                  } catch {}
                          
                          const response = await fetch('/api/invoices', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              vehicleInwardId: selectedEntry.id,
                              invoiceDate: new Date().toISOString().split('T')[0],
                              dueDate: (() => {
                                const date = new Date()
                                date.setDate(date.getDate() + 30)
                                return date.toISOString().split('T')[0]
                              })(),
                              discountAmount: discountFromNotes,
                              discountReason: discountReasonFromNotes,
                                      lineItems: validProducts.map(p => {
                                        const price = parseFloat(p.price) || 0
                                        return {
                                          product_name: p.product || 'Unknown Product',
                                          brand: p.brand || '',
                                          department: p.department || '',
                                quantity: 1,
                                          unit_price: price,
                                          line_total: price
                                        }
                                      }),
                              issueImmediately: true
                            })
                          })
                          
                          const data = await response.json()
                          
                          if (!response.ok) {
                            throw new Error(data.error || 'Failed to create invoice')
                          }
                          
                          if (data.invoice) {
                            // Refresh invoice data
                            await findInvoiceForEntry(selectedEntry.id)
                                    // Small delay to ensure state is updated before opening modal
                                    const timeoutId = setTimeout(() => {
                                      setShowPaymentModal(true)
                                    }, 100)
                                    timeoutRefs.current.push(timeoutId)
                          }
                        } catch (error: any) {
                          logger.error('Error creating invoice:', error)
                                  alert(`Failed to create invoice: ${error.message || 'Unknown error'}`)
                        } finally {
                          setCreatingInvoice(false)
                                }
                              } else {
                                // Invoice exists, just open payment modal
                                setShowPaymentModal(true)
                        }
                      }}
                      disabled={creatingInvoice || !selectedEntry}
                      style={{
                              width: '100%',
                              padding: '0.625rem',
                              backgroundColor: creatingInvoice ? '#9ca3af' : '#059669',
                        color: 'white',
                        border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                        cursor: creatingInvoice ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                              justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                            <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                            {creatingInvoice ? 'Creating Invoice...' : 'Add Payment'}
                    </button>
                  </div>
              </div>
                        </div>
                        </div>
                )}
                      </div>
                          </div>

            {/* Action Buttons - Full Width */}
                          <div style={{ 
              padding: '0 2.5rem 2rem 2.5rem',
              maxWidth: '1400px',
              margin: '0 auto',
              width: '100%',
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'white',
              zIndex: 10
            }}>
              <div style={{ 
                            display: 'flex',
                gap: '1.5rem', 
                justifyContent: 'space-between', 
                            alignItems: 'center',
                paddingTop: '1.5rem', 
                paddingBottom: '1rem',
                borderTop: '2px solid #e5e7eb',
                backgroundColor: 'white'
              }}>
                {/* Primary Actions - Left Side */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {(() => {
                    // Calculate payment status
                    let balance = 0
                    let isFullyPaid = false
                    let showAddPayment = false
                    let showMarkComplete = false
                    
                    if (selectedInvoiceForPayment) {
                      const subtotal = selectedEntry?.products.reduce((sum, p) => sum + p.price, 0) || parseFloat(selectedInvoiceForPayment.total_amount || 0)
                      const discount = parseFloat(selectedInvoiceForPayment.discount_amount || 0)
                      const tax = parseFloat(selectedInvoiceForPayment.tax_amount || 0)
                      const total = subtotal - discount + tax
                      const paid = parseFloat(selectedInvoiceForPayment.paid_amount || 0)
                      balance = total - paid
                      isFullyPaid = balance <= 0
                      
                      // Show Add Payment if balance > 0 and entry is not completed
                      showAddPayment = balance > 0 && selectedEntry.status !== 'completed'
                      
                      // Show Mark Complete if fully paid or status is installation_complete
                      showMarkComplete = isFullyPaid || selectedEntry.status === 'installation_complete'
                    } else {
                      // No invoice - show Mark Complete if status is installation_complete
                      showMarkComplete = selectedEntry.status === 'installation_complete'
                    }
                    
                    return (
                      <>
                        {/* Add Payment Button */}
                        {showAddPayment && (
                      <button
                            onClick={() => setShowPaymentModal(true)}
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
                          fontWeight: '600',
                          cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                          >
                            <DollarSign style={{ width: '1rem', height: '1rem' }} />
                            Add Payment
                      </button>
                        )}
                        
                        {/* Mark as Complete Button - For installation_complete status */}
                        {showMarkComplete && selectedEntry.status === 'installation_complete' && (
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
                              fontWeight: '600',
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
                            <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                    {updatingStatus ? 'Marking Complete...' : 'Mark as Complete'}
                  </button>
                )}

                        {/* Mark as Complete Button - For fully paid invoices */}
                        {showMarkComplete && selectedInvoiceForPayment && isFullyPaid && selectedEntry.status !== 'installation_complete' && (
                  <button
                            onClick={async () => {
                              if (!selectedInvoiceForPayment || !selectedEntry) return
                              
                              if (!confirm('Are you sure you want to mark this entry as Complete? This will finalize the payment and mark the invoice as paid.')) {
                                return
                              }
                              
                              try {
                                setUpdatingStatus(true)
                                
                                // Update invoice status to paid
                                const { error: invoiceError } = await supabase
                                  .from('invoices')
                                  .update({ 
                                    status: 'paid',
                                    balance_amount: 0,
                                    paid_date: new Date().toISOString().split('T')[0]
                                  })
                                  .eq('id', selectedInvoiceForPayment.id)
                                
                                if (invoiceError) throw invoiceError
                                
                                // Refresh invoice data
                                const { data: updatedInvoice } = await supabase
                                  .from('invoices')
                                  .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
                                  .eq('id', selectedInvoiceForPayment.id)
                                  .single()
                                
                                if (updatedInvoice) {
                                  setSelectedInvoiceForPayment(updatedInvoice)
                                }
                                
                                // Refresh payment history
                                await fetchPaymentHistory(selectedInvoiceForPayment.id)
                                
                                // Refresh summary
                                fetchSummary()
                                
                                alert('Entry marked as complete successfully!')
                              } catch (error: any) {
                                logger.error('Error marking as complete:', error)
                                alert(`Failed to mark as complete: ${error.message}`)
                              } finally {
                                setUpdatingStatus(false)
                              }
                            }}
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
                      fontWeight: '600',
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
                            <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                            {updatingStatus ? 'Marking Complete...' : 'Mark as Complete'}
                  </button>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Secondary Actions - Right Side */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <PaymentRecordingModal
          invoiceId={selectedInvoiceForPayment.id}
          invoiceNumber={selectedInvoiceForPayment.invoice_number || 'N/A'}
          balanceAmount={parseFloat(selectedInvoiceForPayment.balance_amount || 0)}
          onClose={() => {
            setShowPaymentModal(false)
          }}
          onSuccess={async () => {
            // Refresh payment history and invoice data for the current entry only
            if (selectedInvoiceForPayment && selectedEntry) {
              const invoiceId = selectedInvoiceForPayment.id
              await fetchPaymentHistory(invoiceId)
              
              // Refresh invoice data with all fields including discount
              const tenantId = getCurrentTenantId()
              const isSuper = isSuperAdmin()
              
              let invoiceQuery = supabase
                .from('invoices')
                .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
                .eq('id', invoiceId)
              
              if (!isSuper && tenantId) {
                invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
              }
              
              const { data: updatedInvoice } = await invoiceQuery.maybeSingle()
              
              if (updatedInvoice) {
                setSelectedInvoiceForPayment(updatedInvoice)
                
                // Update the invoice in the invoices list if it exists there (to avoid duplicates)
                setInvoices(prevInvoices => {
                  const invoiceIndex = prevInvoices.findIndex(inv => inv.id === invoiceId)
                  if (invoiceIndex >= 0) {
                    // Update existing invoice in list
                    const updated = [...prevInvoices]
                    updated[invoiceIndex] = {
                      ...updated[invoiceIndex],
                      ...updatedInvoice
                    }
                    return updated
                  }
                  // If not in list, don't add it - just return existing list
                  return prevInvoices
                })
              }
              
              // Refresh summary only (don't refresh entire invoice list to avoid duplicates)
              fetchSummary()
            }
            setShowPaymentModal(false)
          }}
        />
      )}

      {/* Payment Edit Modal */}
      {editingPayment && selectedInvoiceForPayment && (
        <PaymentRecordingModal
          invoiceId={selectedInvoiceForPayment.id}
          invoiceNumber={selectedInvoiceForPayment.invoice_number || 'N/A'}
          balanceAmount={parseFloat(selectedInvoiceForPayment.balance_amount || 0)}
          payment={editingPayment}
          onClose={() => {
            setEditingPayment(null)
          }}
          onSuccess={async () => {
            // Refresh payment history and invoice data for the current entry only
            if (selectedInvoiceForPayment && selectedEntry) {
              const invoiceId = selectedInvoiceForPayment.id
              await fetchPaymentHistory(invoiceId)
              
              // Refresh invoice data with all fields including discount
              const tenantId = getCurrentTenantId()
              const isSuper = isSuperAdmin()
              
              let invoiceQuery = supabase
                .from('invoices')
                .select('id, invoice_number, total_amount, paid_amount, balance_amount, status, due_date, discount_amount, discount_reason, tax_amount')
                .eq('id', invoiceId)
              
              if (!isSuper && tenantId) {
                invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
              }
              
              const { data: updatedInvoice } = await invoiceQuery.maybeSingle()
              
              if (updatedInvoice) {
                setSelectedInvoiceForPayment(updatedInvoice)
                
                // Update the invoice in the invoices list if it exists there (to avoid duplicates)
                setInvoices(prevInvoices => {
                  const invoiceIndex = prevInvoices.findIndex(inv => inv.id === invoiceId)
                  if (invoiceIndex >= 0) {
                    // Update existing invoice in list
                    const updated = [...prevInvoices]
                    updated[invoiceIndex] = {
                      ...updated[invoiceIndex],
                      ...updatedInvoice
                    }
                    return updated
                  }
                  // If not in list, don't add it - just return existing list
                  return prevInvoices
                })
              }
              
              // Refresh summary only (don't refresh entire invoice list to avoid duplicates)
              fetchSummary()
            }
            setEditingPayment(null)
          }}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoiceId={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={() => {
            fetchSummary()
            const statusMap: Record<string, string> = {
              'entries': 'all',
              'partial': 'partial',
              'overdue': 'overdue',
              'settled': 'paid'
            }
            if (['entries', 'partial', 'overdue', 'settled'].includes(activeTab)) {
              fetchInvoicesByStatus(statusMap[activeTab] || activeTab)
            }
          }}
        />
      )}
    </div>
  )
}
