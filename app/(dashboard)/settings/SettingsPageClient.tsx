'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Bell, Save, Users, Wrench, MapPin, UserCheck, Edit, Trash2, Plus, X, DollarSign, Briefcase, Car, MessageSquare, Smartphone, ToggleLeft, ToggleRight, FileText, Clock, Mail, HelpCircle, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UserManagementModal from '@/components/UserManagementModal'
import { whatsappService, type WhatsAppConfig } from '@/lib/whatsapp-service'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

export default function SettingsPageClient() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [managementTab, setManagementTab] = useState('installers')
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [modalRole, setModalRole] = useState<'installer' | 'manager' | 'coordinator' | 'accountant'>('installer')
  
  // Forms for vehicle types and departments
  const [showVehicleTypeForm, setShowVehicleTypeForm] = useState(false)
  const [showDepartmentForm, setShowDepartmentForm] = useState(false)
  const [editingVehicleType, setEditingVehicleType] = useState<any>(null)
  const [editingDepartment, setEditingDepartment] = useState<any>(null)
  const [vehicleTypeForm, setVehicleTypeForm] = useState({ name: '', status: 'active' })
  const [departmentForm, setDepartmentForm] = useState({ name: '', status: 'active', color: '#3b82f6' })
  
  // Forms for locations
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<any>(null)
  const [locationForm, setLocationForm] = useState({ name: '', address: '', status: 'active' })
  
  // User management data
  const [users, setUsers] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [installersList, setInstallersList] = useState<any[]>([])
  const [accountantsList, setAccountantsList] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  // Profile and Company settings state
  const [profileSettings, setProfileSettings] = useState({
    name: 'Raghav Sukhadia',
    email: 'raghav@sunkool.in'
  })
  
  const [companySettings, setCompanySettings] = useState({
    name: 'RS Car Accessories',
    address: '510, Western Palace, opposite Park, Congress Nagar, Nagpur, Maharashtra 440012',
    phone: '081491 11110',
    email: '',
    website: '',
    businessHours: 'Open - Closes 7 pm',
    openingTime: '09:00',
    closingTime: '19:00',
    gstNumber: '',
    panNumber: '',
    registrationNumber: ''
  })
  
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'coordinator' | 'installer' | 'accountant'>('installer')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [passwordSettings, setPasswordSettings] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)

  // WhatsApp Notification Settings
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    enabled: false,
    provider: 'messageautosender',
    fromNumber: '',
    accountSid: '',
    authToken: '',
    businessAccountId: '',
    accessToken: '',
    webhookUrl: '',
    apiKey: '',
    apiSecret: '',
    userId: '',
    password: '',
  })
  const [notificationPreferences, setNotificationPreferences] = useState<any[]>([])
  const [messageTemplates, setMessageTemplates] = useState<any[]>([])
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null)
  const [templateContent, setTemplateContent] = useState<Map<string, string>>(new Map())
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false)
  const [savingTemplates, setSavingTemplates] = useState(false)
  
  // Payment proof state
  const [paymentProofs, setPaymentProofs] = useState<any[]>([])
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial')
  const [subscription, setSubscription] = useState<any>(null)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    file: null as File | null,
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [uploadingProof, setUploadingProof] = useState(false)

  // Subscription activation state
  const [requestingActivation, setRequestingActivation] = useState(false)
  const [activationRequestStatus, setActivationRequestStatus] = useState<any>(null)
  const [supportEmails, setSupportEmails] = useState<string[]>([])
  const [loadingSupport, setLoadingSupport] = useState(false)
  
  // Filter users by role
  const coordinators = users.filter(u => u.role === 'coordinator')
  const installersUsers = users.filter(u => u.role === 'installer')
  const accountantsUsers = users.filter(u => u.role === 'accountant')
  
  // Use profiles data - installers, accountants, coordinators are all in profiles table
  const installers = installersUsers.length > 0 ? installersUsers : installersList
  const accountants = accountantsUsers.length > 0 ? accountantsUsers : accountantsList

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'company', label: 'Company', icon: Settings },
    { id: 'management', label: 'Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payment', label: 'Payment', icon: DollarSign },
  ]
  const filteredTabs = (userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager' || userRole === 'accountant') 
    ? tabs.filter(t => t.id === 'company') 
    : tabs.filter(t => t.id !== 'payment' || userRole === 'admin') // Show payment tab only for admins

  // Load data from Supabase on mount
  useEffect(() => {
    loadCurrentUser()
    fetchUsers()
    fetchInstallers()
    fetchManagers()
    fetchAccountants()
    fetchLocations()
    fetchVehicleTypes()
    fetchDepartments()
    fetchSystemSettings()
    fetchWhatsappSettings()
    fetchNotificationPreferences()
    fetchMessageTemplates()
    fetchPaymentProofs()
  }, [])

  // Auto-update days remaining every minute
  useEffect(() => {
    const calculateDaysRemaining = () => {
      const hasApprovedProof = paymentProofs.some(p => p.status === 'approved')
      const approvedProof = paymentProofs.find(p => p.status === 'approved')
      
      let startDate: string | null = null
      let endDate: string | null = null
      
      if (subscription && subscription.billing_period_start && subscription.billing_period_end) {
        startDate = subscription.billing_period_start
        endDate = subscription.billing_period_end
      } else if (approvedProof) {
        const paymentDate = approvedProof.payment_date 
          ? new Date(approvedProof.payment_date)
          : new Date(approvedProof.created_at)
        const calculatedStartDate = new Date(paymentDate)
        calculatedStartDate.setHours(0, 0, 0, 0)
        const calculatedEndDate = new Date(calculatedStartDate)
        calculatedEndDate.setDate(calculatedEndDate.getDate() + 365)
        calculatedEndDate.setHours(23, 59, 59, 999)
        startDate = calculatedStartDate.toISOString()
        endDate = calculatedEndDate.toISOString()
      }
      
      if (startDate && endDate) {
        const now = new Date().getTime()
        const end = new Date(endDate).getTime()
        const diff = end - now
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
        setDaysRemaining(days)
      } else {
        setDaysRemaining(null)
      }
    }

    // Calculate immediately
    calculateDaysRemaining()

    // Update every minute
    const interval = setInterval(calculateDaysRemaining, 60000)

    return () => clearInterval(interval)
  }, [subscription, paymentProofs])

  const loadCurrentUser = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        
        // Check if user is admin in tenant_users table (for tenant admins)
        let isTenantAdmin = false
        if (tenantId) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('role')
            .eq('tenant_id', tenantId)
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single()
          
          if (tenantUser) {
            isTenantAdmin = true
          }
        }
        
        // Fetch profile data
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (!error && profile) {
          // If user is tenant admin, set role to 'admin' regardless of profile role
          const effectiveRole = isTenantAdmin ? 'admin' : profile.role
          setUserRole(effectiveRole as any)
          
          if (effectiveRole === 'installer' || effectiveRole === 'coordinator' || effectiveRole === 'manager' || effectiveRole === 'accountant') {
            setActiveTab('company')
          }
          setProfileSettings(prev => ({
            ...prev,
            name: profile.name || prev.name,
            email: profile.email || user.email || prev.email
          }))
        } else {
          // Use auth user data if profile not found
          // If tenant admin, set role to admin
          if (isTenantAdmin) {
            setUserRole('admin')
          }
          setProfileSettings(prev => ({
            ...prev,
            email: user.email || prev.email,
            name: user.user_metadata?.name || prev.name
          }))
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  const fetchPaymentProofs = async () => {
    try {
      const response = await fetch('/api/tenants/payment-proof')
      if (response.ok) {
        const data = await response.json()
        setPaymentProofs(data.payment_proofs || [])
        setTrialEndsAt(data.tenant?.trial_ends_at)
        setIsActive(data.tenant?.is_active || false)
        setSubscriptionStatus(data.tenant?.subscription_status || 'trial')
        setSubscription(data.subscription || null)
      }
    } catch (error) {
      console.error('Error fetching payment proofs:', error)
    }
  }

  const fetchSupportEmails = async () => {
    try {
      setLoadingSupport(true)
      const response = await fetch('/api/admin/support-emails')
      if (response.ok) {
        const data = await response.json()
        setSupportEmails(data.emails || [])
      }
    } catch (error) {
      console.error('Error fetching support emails:', error)
    } finally {
      setLoadingSupport(false)
    }
  }

  const checkActivationRequestStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (!tenantUser) return

      // Check for pending activation request (subscription plan request for annual plan)
      const { data: request } = await supabase
        .from('subscription_plan_requests')
        .select('*')
        .eq('tenant_id', tenantUser.tenant_id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setActivationRequestStatus(request)
    } catch (error) {
      console.error('Error checking activation request status:', error)
    }
  }

  const handleRequestActivation = async () => {
    try {
      setRequestingActivation(true)
      
      // Request the standard annual plan (Rs. 12,000/year)
      const response = await fetch('/api/tenants/subscription-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_name: 'annual',
          plan_display_name: 'Annual Plan',
          amount: 12000,
          currency: 'INR',
          billing_cycle: 'annual'
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('Activation request submitted successfully! Super admin will review your request and activate your account after payment verification.')
        checkActivationRequestStatus()
      } else {
        alert(data.error || 'Failed to submit activation request')
      }
    } catch (error) {
      console.error('Error requesting activation:', error)
      alert('An error occurred while submitting the activation request')
    } finally {
      setRequestingActivation(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'payment' && userRole === 'admin') {
      fetchPaymentProofs()
      fetchSupportEmails()
      checkActivationRequestStatus()
    }
  }, [activeTab, userRole])

  const handlePaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentForm.file) {
      alert('Please select a payment proof file')
      return
    }

    setUploadingProof(true)
    try {
      const formData = new FormData()
      formData.append('file', paymentForm.file)
      formData.append('transactionId', paymentForm.transactionId)
      formData.append('paymentDate', paymentForm.paymentDate)
      formData.append('notes', paymentForm.notes)

      const response = await fetch('/api/tenants/payment-proof', {
        method: 'POST',
        body: formData
      })

      // Check if response is ok before parsing
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.details || errorMessage
          } catch (e) {
            // If JSON parsing fails, try to get text
            try {
              const text = await response.text()
              if (text && text.trim()) {
                errorMessage = text
              }
            } catch (textError) {
              console.error('Failed to read error response:', textError)
            }
          }
        } else {
          // Response is not JSON, try to get text
          try {
            const text = await response.text()
            if (text && text.trim()) {
              errorMessage = text
            }
          } catch (textError) {
            console.error('Failed to read error response:', textError)
          }
        }
        
        alert(errorMessage || 'Failed to submit payment proof')
        return
      }

      // Parse successful response
      let data: any = {}
      try {
        data = await response.json()
      } catch (e) {
        console.error('Failed to parse response as JSON:', e)
        alert('Payment proof submitted, but received an unexpected response format.')
        return
      }

      alert('Payment proof submitted successfully! It will be reviewed by super admin.')
      setPaymentForm({
        file: null,
        transactionId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
      fetchPaymentProofs()
    } catch (error: any) {
      console.error('Error submitting payment proof:', error)
      alert(`An error occurred while submitting payment proof: ${error?.message || 'Unknown error'}`)
    } finally {
      setUploadingProof(false)
    }
  }

  const calculateTimeRemaining = () => {
    if (!trialEndsAt) return null
    const now = new Date().getTime()
    const end = new Date(trialEndsAt).getTime()
    const diff = end - now
    
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return { days, hours, minutes, seconds, expired: false }
  }

  const timeRemaining = calculateTimeRemaining()
  
  // Fetch functions
  const fetchUsers = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // For tenant users, get users from tenant_users table
      if (!isSuper && tenantId) {
        const { data: tenantUsers, error: tenantUsersError } = await supabase
          .from('tenant_users')
          .select('user_id, role')
          .eq('tenant_id', tenantId)
          .in('role', ['coordinator', 'installer', 'accountant', 'manager'])
        
        if (tenantUsersError) throw tenantUsersError
        
        if (tenantUsers && tenantUsers.length > 0) {
          const userIds = tenantUsers.map(tu => tu.user_id)
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)
            .order('created_at', { ascending: false })
          
          if (profilesError) throw profilesError
          setUsers(profiles || [])
        } else {
          setUsers([])
        }
      } else {
        // Super admin sees all users
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['coordinator', 'installer', 'accountant', 'manager'])
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchInstallers = async () => {
    try {
      let tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // If tenant_id is missing, try to fetch it from database
      if (!isSuper && !tenantId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser?.tenant_id) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
          }
        }
      }
      
      if (!isSuper && tenantId) {
        // Get installers for this tenant
        const { data: tenantUsers, error: tenantUsersError } = await supabase
          .from('tenant_users')
          .select('user_id, role, tenant_id')
          .eq('tenant_id', tenantId)
          .eq('role', 'installer')
        
        if (tenantUsersError) {
          throw tenantUsersError
        }
        
        if (tenantUsers && tenantUsers.length > 0) {
          const userIds = tenantUsers.map(tu => tu.user_id)
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)
            .order('created_at', { ascending: false })
          
          if (error) throw error
          
          setInstallersList(data || [])
        } else {
          setInstallersList([])
        }
      } else {
        // Super admin sees all installers
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'installer')
          .order('created_at', { ascending: false })
        if (error) throw error
        setInstallersList(data || [])
      }
    } catch (error) {
      console.error('Error fetching installers:', error)
      setInstallersList([])
    }
  }

  const fetchManagers = async () => {
    try {
      let tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // If tenant_id is missing, try to fetch it from database
      if (!isSuper && !tenantId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser?.tenant_id) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
          }
        }
      }
      
      if (!isSuper && tenantId) {
        // Get managers for this tenant
        const { data: tenantUsers, error: tenantUsersError } = await supabase
          .from('tenant_users')
          .select('user_id, role, tenant_id')
          .eq('tenant_id', tenantId)
          .eq('role', 'manager')
        
        if (tenantUsersError) throw tenantUsersError
        
        if (tenantUsers && tenantUsers.length > 0) {
          const userIds = tenantUsers.map(tu => tu.user_id)
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)
            .order('created_at', { ascending: false })
          if (error) throw error
          setManagers(data || [])
        } else {
          setManagers([])
        }
      } else {
        // Super admin sees all managers
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'manager')
          .order('created_at', { ascending: false })
        if (error) throw error
        setManagers(data || [])
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
      setManagers([])
    }
  }

  const fetchAccountants = async () => {
    try {
      let tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // If tenant_id is missing, try to fetch it from database
      if (!isSuper && !tenantId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser?.tenant_id) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
          }
        }
      }
      
      if (!isSuper && tenantId) {
        // Get accountants for this tenant
        const { data: tenantUsers, error: tenantUsersError } = await supabase
          .from('tenant_users')
          .select('user_id, role, tenant_id')
          .eq('tenant_id', tenantId)
          .eq('role', 'accountant')
        
        if (tenantUsersError) throw tenantUsersError
        
        if (tenantUsers && tenantUsers.length > 0) {
          const userIds = tenantUsers.map(tu => tu.user_id)
          
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)
            .order('created_at', { ascending: false })
          if (error) throw error
          setAccountantsList(data || [])
        } else {
          setAccountantsList([])
        }
      } else {
        // Super admin sees all accountants
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'accountant')
          .order('created_at', { ascending: false })
        if (error) throw error
        setAccountantsList(data || [])
      }
    } catch (error) {
      console.error('Error fetching accountants:', error)
      setAccountantsList([])
    }
  }

  const fetchLocations = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase.from('locations').select('*').order('created_at', { ascending: false })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchVehicleTypes = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase.from('vehicle_types').select('*').order('name', { ascending: true })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query
      if (error) throw error
      setVehicleTypes(data || [])
    } catch (error) {
      console.error('Error fetching vehicle types:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let query = supabase.from('departments').select('*').order('name', { ascending: true })
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query
      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const getDepartmentNames = (value: any) => {
    try {
      const map = new Map(departments.map((d: any) => [d.id, d.name]))
      // Accept array of ids, comma-delimited string, or names
      let ids: string[] = []
      if (Array.isArray(value)) ids = value
      else if (typeof value === 'string') ids = value.split(',').map(s => s.trim()).filter(Boolean)
      const names = ids.map(id => map.get(id) || id)
      return names.length ? names.join(', ') : (value || '-')
    } catch {
      return value || '-'
    }
  }

  const fetchWhatsappSettings = async () => {
    try {
      setLoadingWhatsapp(true)
      const tenantId = getCurrentTenantId()
      const config = await whatsappService.loadConfig(supabase, tenantId)
      if (config) {
        setWhatsappConfig(config)
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error)
    } finally {
      setLoadingWhatsapp(false)
    }
  }

  const fetchNotificationPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setNotificationPreferences(data)
      } else {
        // Fetch all users to create default preferences
        const { data: allUsersData } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['installer', 'coordinator', 'accountant', 'manager'])
        
        if (allUsersData && allUsersData.length > 0) {
          const defaultPrefs = allUsersData.map((user: any) => ({
            user_id: user.id,
            role: user.role,
            whatsapp_enabled: true,
            phone_number: user.phone || '',
            notify_on_vehicle_created: true,
            notify_on_status_updated: true,
            notify_on_installation_complete: true,
            notify_on_invoice_added: true,
            notify_on_accountant_complete: true,
            notify_on_vehicle_delivered: true,
          }))

          if (defaultPrefs.length > 0) {
            const { error: insertError } = await supabase
              .from('notification_preferences')
              .upsert(defaultPrefs, { onConflict: 'user_id,role' })
            
            if (!insertError) {
              setNotificationPreferences(defaultPrefs as any)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
    }
  }

  const fetchMessageTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('event_type')
      
      if (error) {
        // If table doesn't exist or RLS error, use default templates
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Message templates table not found. Using default templates. Please run the database migration.')
          loadDefaultTemplates()
          return
        }
        throw error
      }
      
      if (data && data.length > 0) {
        setMessageTemplates(data)
        const templateMap = new Map<string, string>()
        data.forEach((template: any) => {
          templateMap.set(template.event_type, template.template)
        })
        setTemplateContent(templateMap)
      } else {
        // Set default templates if none exist in database
        loadDefaultTemplates()
      }
    } catch (error: any) {
      console.error('Error fetching message templates:', error)
      // On any error, load default templates so UI doesn't break
      loadDefaultTemplates()
    }
  }

  const loadDefaultTemplates = () => {
    const defaultTemplates = [
      { event_type: 'vehicle_inward_created', template: '≡ƒÜù *New Vehicle Entry*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nStatus: Pending\n\nPlease check the dashboard for details.' },
      { event_type: 'installation_complete', template: 'Γ£à *Installation Complete*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nAll products have been installed successfully.\n\nReady for accountant review.' },
      { event_type: 'invoice_number_added', template: '≡ƒº╛ *Invoice Number Added*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice number has been set by accountant.\n\nPlease check the dashboard for details.' },
      { event_type: 'accountant_completed', template: '✓ *Accountant Completed*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nInvoice processing completed.\n\nReady for delivery.' },
      { event_type: 'vehicle_delivered', template: '≡ƒÄë *Vehicle Delivered*\n\nVehicle: {{vehicleNumber}}\nCustomer: {{customerName}}\n\nVehicle has been marked as delivered.\n\nThank you for your work!' },
    ]
    setMessageTemplates(defaultTemplates as any)
    const templateMap = new Map<string, string>()
    defaultTemplates.forEach(t => templateMap.set(t.event_type, t.template))
    setTemplateContent(templateMap)
  }

  const saveMessageTemplates = async () => {
    try {
      setSavingTemplates(true)

      for (const [eventType, template] of templateContent.entries()) {
        await supabase
          .from('message_templates')
          .upsert({ event_type: eventType, template: template }, { onConflict: 'event_type' })
      }

      alert('Message templates saved successfully!')
      await fetchMessageTemplates()
    } catch (error: any) {
      console.error('Error saving message templates:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setSavingTemplates(false)
    }
  }

  const saveWhatsappSettings = async () => {
    try {
      setSavingWhatsapp(true)
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()

      const settings = [
        { 
          setting_key: 'whatsapp_enabled', 
          setting_value: whatsappConfig.enabled.toString(), 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_provider', 
          setting_value: whatsappConfig.provider, 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_user_id', 
          setting_value: whatsappConfig.userId || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_password', 
          setting_value: whatsappConfig.password || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_api_key', 
          setting_value: whatsappConfig.apiKey || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_from_number', 
          setting_value: whatsappConfig.fromNumber || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_account_sid', 
          setting_value: whatsappConfig.accountSid || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_auth_token', 
          setting_value: whatsappConfig.authToken || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_business_account_id', 
          setting_value: whatsappConfig.businessAccountId || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_access_token', 
          setting_value: whatsappConfig.accessToken || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_webhook_url', 
          setting_value: whatsappConfig.webhookUrl || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
        { 
          setting_key: 'whatsapp_api_secret', 
          setting_value: whatsappConfig.apiSecret || '', 
          setting_group: 'whatsapp_notifications',
          tenant_id: (!isSuper && tenantId) ? tenantId : null
        },
      ]

      for (const setting of settings) {
        // CRITICAL: Always filter by tenant_id to ensure data isolation
        // For tenant users, tenantId must be set and not null
        if (!tenantId && !isSuper) {
          console.error('Cannot save WhatsApp settings: tenantId is required for tenant users')
          throw new Error('Tenant ID is required to save settings')
        }
        
        // Check if setting exists for this specific tenant
        let query = supabase
          .from('system_settings')
          .select('id, tenant_id')
          .eq('setting_key', setting.setting_key)
          .eq('setting_group', setting.setting_group)
        
        // CRITICAL: Always filter by tenant_id for tenant users
        if (tenantId && !isSuper) {
          query = query.eq('tenant_id', tenantId)
        } else if (isSuper) {
          // Super admin can have global settings (null tenant_id)
          query = query.is('tenant_id', null)
        } else {
          // This should not happen, but handle it
          throw new Error('Invalid tenant context')
        }
        
        const { data: existing, error: queryError } = await query.maybeSingle()
        
        if (queryError) {
          console.error('Error checking existing WhatsApp setting:', queryError)
          throw queryError
        }
        
        if (existing) {
          // Update existing setting - CRITICAL: Verify tenant_id matches
          if (tenantId && !isSuper && existing.tenant_id !== tenantId) {
            console.error('Security violation: Attempted to update WhatsApp setting from different tenant', {
              existingTenantId: existing.tenant_id,
              currentTenantId: tenantId
            })
            throw new Error('Cannot update settings from another tenant')
          }
          
          // Update with explicit tenant_id filter for security
          let updateQuery = supabase
            .from('system_settings')
            .update({
              setting_value: setting.setting_value,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
          
          // Add tenant_id filter for extra security
          if (tenantId && !isSuper) {
            updateQuery = updateQuery.eq('tenant_id', tenantId)
          }
          
          const { error: updateError } = await updateQuery
          
          if (updateError) {
            console.error('Error updating WhatsApp setting:', updateError)
            throw updateError
          }
        } else {
          // Insert new setting - ensure tenant_id is set
          const insertData = {
            ...setting,
            tenant_id: (tenantId && !isSuper) ? tenantId : null
          }
          
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert(insertData)
          
          if (insertError) {
            console.error('Error inserting WhatsApp setting:', insertError, insertData)
            throw insertError
          }
        }
      }

      // Initialize WhatsApp service with new config
      await whatsappService.initialize(whatsappConfig)

      // Reload settings to ensure UI shows saved values
      await fetchWhatsappSettings()

      alert('WhatsApp settings saved successfully!')
    } catch (error: any) {
      console.error('Error saving WhatsApp settings:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setSavingWhatsapp(false)
    }
  }

  const saveNotificationPreferences = async () => {
    try {
      for (const pref of notificationPreferences) {
        await supabase
          .from('notification_preferences')
          .upsert(pref, { onConflict: 'user_id,role' })
      }
      alert('Notification preferences saved successfully!')
    } catch (error: any) {
      console.error('Error saving notification preferences:', error)
      alert(`Failed to save: ${error.message}`)
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // First, try to load company info from tenants table (most accurate)
      if (tenantId && !isSuper) {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('name, workspace_url')
          .eq('id', tenantId)
          .single()
        
        if (!tenantError && tenant) {
          // Set company name from tenant
          setCompanySettings(prev => ({
            ...prev,
            name: tenant.name
          }))
        }
      }
      
      // Load settings from system_settings table (filtered by tenant)
      let query = supabase
        .from('system_settings')
        .select('*')
        .in('setting_group', ['profile', 'company'])
      
      // Add tenant filter
      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const profileData: any = {}
        const companyData: any = {}
        
        data.forEach(setting => {
          if (setting.setting_group === 'profile') {
            const key = setting.setting_key.replace('profile_', '')
            profileData[key] = setting.setting_value
          } else if (setting.setting_group === 'company') {
            const key = setting.setting_key.replace('company_', '')
            companyData[key] = setting.setting_value
          }
        })
        
        // Merge with existing profile settings (loaded from user auth)
        setProfileSettings(prev => {
          const merged = { ...prev, ...profileData }
          // Don't override name/email if we have user data (they come from loadCurrentUser)
          return merged
        })
        setCompanySettings(prev => ({ ...prev, ...companyData }))
      } else {
        // Set default values if no settings found
        // For tenant users, use tenant name as default company name
        if (tenantId && !isSuper) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .single()
          
          setCompanySettings({
            name: tenant?.name || 'Company Name',
            address: '',
            phone: '',
            email: '',
            website: '',
            businessHours: 'Open - Closes 7 pm',
            openingTime: '09:00',
            closingTime: '19:00',
            gstNumber: '',
            panNumber: '',
            registrationNumber: ''
          })
        } else {
          // Default for super admin or no tenant
          setProfileSettings({
            name: 'Raghav Sukhadia',
            email: 'raghav@sunkool.in'
          })
          setCompanySettings({
            name: 'RS Car Accessories',
            address: '510, Western Palace, opposite Park, Congress Nagar, Nagpur, Maharashtra 440012',
            phone: '081491 11110',
            email: '',
            website: '',
            businessHours: 'Open - Closes 7 pm',
            openingTime: '09:00',
            closingTime: '19:00',
            gstNumber: '',
            panNumber: '',
            registrationNumber: ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching system settings:', error)
      // Set defaults on error
      setProfileSettings({
        name: 'Raghav Sukhadia',
        email: 'raghav@sunkool.in'
      })
    }
  }

  const saveProfileSettings = async () => {
    if (!currentUser) {
      alert('Please log in to update your profile')
      return
    }

    setSaving(true)
    try {
      // Update auth user and profile via API
      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          name: profileSettings.name,
          email: profileSettings.email,
          designation: 'Admin' // Always Admin for first user
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      // Also save to system_settings
      const settings = [
        { setting_key: 'profile_name', setting_value: profileSettings.name, setting_group: 'profile' },
        { setting_key: 'profile_email', setting_value: profileSettings.email, setting_group: 'profile' },
        { setting_key: 'profile_designation', setting_value: 'Admin', setting_group: 'profile' }
      ]

      for (const setting of settings) {
        await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'setting_key' })
      }

      // Refresh user data
      await loadCurrentUser()
      
      // Show success message
      alert('Profile updated successfully! Changes will be reflected across the application.')
      
      // Refresh the page to update UI
      window.location.reload()
    } catch (error: any) {
      console.error('Error saving profile settings:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!currentUser) {
      alert('Please log in to change your password')
      return
    }

    if (!passwordSettings.newPassword || !passwordSettings.confirmPassword) {
      alert('Please fill in all password fields')
      return
    }

    if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
      alert('New passwords do not match. Please ensure both password fields are identical.')
      return
    }

    if (passwordSettings.newPassword.length < 8) {
      alert('Password must be at least 8 characters long for better security')
      return
    }

    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/i
    if (!passwordRegex.test(passwordSettings.newPassword)) {
      const useStronger = confirm(
        'For better security, we recommend using a password with at least one uppercase letter, one lowercase letter, and one number.\n\nDo you want to continue with the current password?'
      )
      if (!useStronger) {
        return
      }
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser.id,
          password: passwordSettings.newPassword
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update password')
      }

      alert('Password updated successfully! You will need to log in again with your new password.')
      
      // Clear password fields
      setPasswordSettings({
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      alert(`Failed to change password: ${error.message}`)
    } finally {
      setChangingPassword(false)
    }
  }

  const saveCompanySettings = async () => {
    setSaving(true)
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // Update tenant name if it changed
      if (tenantId && !isSuper) {
        const { error: tenantUpdateError } = await supabase
          .from('tenants')
          .update({ name: companySettings.name })
          .eq('id', tenantId)
        
        if (tenantUpdateError) {
          console.error('Error updating tenant name:', tenantUpdateError)
        }
      }
      
      const settings = [
        { 
          setting_key: 'company_name', 
          setting_value: companySettings.name, 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_address', 
          setting_value: companySettings.address, 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_phone', 
          setting_value: companySettings.phone, 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_email', 
          setting_value: companySettings.email || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_website', 
          setting_value: companySettings.website || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_business_hours', 
          setting_value: companySettings.businessHours || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_opening_time', 
          setting_value: companySettings.openingTime || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_closing_time', 
          setting_value: companySettings.closingTime || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_gst_number', 
          setting_value: companySettings.gstNumber || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_pan_number', 
          setting_value: companySettings.panNumber || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        },
        { 
          setting_key: 'company_registration_number', 
          setting_value: companySettings.registrationNumber || '', 
          setting_group: 'company',
          tenant_id: tenantId || null
        }
      ]

      for (const setting of settings) {
        // CRITICAL: Always filter by tenant_id to ensure data isolation
        // For tenant users, tenantId must be set and not null
        if (!tenantId && !isSuper) {
          console.error('Cannot save settings: tenantId is required for tenant users')
          throw new Error('Tenant ID is required to save settings')
        }
        
        // Check if setting exists for this specific tenant
        let query = supabase
          .from('system_settings')
          .select('id, tenant_id')
          .eq('setting_key', setting.setting_key)
          .eq('setting_group', setting.setting_group)
        
        // CRITICAL: Always filter by tenant_id for tenant users
        if (tenantId && !isSuper) {
          query = query.eq('tenant_id', tenantId)
        } else if (isSuper) {
          // Super admin can have global settings (null tenant_id)
          query = query.is('tenant_id', null)
        } else {
          // This should not happen, but handle it
          throw new Error('Invalid tenant context')
        }
        
        const { data: existing, error: queryError } = await query.maybeSingle()
        
        if (queryError) {
          console.error('Error checking existing setting:', queryError)
          throw queryError
        }
        
        if (existing) {
          // Update existing setting - CRITICAL: Verify tenant_id matches
          if (tenantId && !isSuper && existing.tenant_id !== tenantId) {
            console.error('Security violation: Attempted to update setting from different tenant', {
              existingTenantId: existing.tenant_id,
              currentTenantId: tenantId
            })
            throw new Error('Cannot update settings from another tenant')
          }
          
          // Update with explicit tenant_id filter for security
          let updateQuery = supabase
            .from('system_settings')
            .update({
              setting_value: setting.setting_value,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
          
          // Add tenant_id filter for extra security
          if (tenantId && !isSuper) {
            updateQuery = updateQuery.eq('tenant_id', tenantId)
          }
          
          const { error: updateError } = await updateQuery
          
          if (updateError) {
            console.error('Error updating setting:', updateError)
            throw updateError
          }
        } else {
          // Insert new setting - ensure tenant_id is set
          const insertData = {
            ...setting,
            tenant_id: (tenantId && !isSuper) ? tenantId : null
          }
          
          const { error: insertError } = await supabase
            .from('system_settings')
            .insert(insertData)
          
          if (insertError) {
            console.error('Error inserting setting:', insertError, insertData)
            throw insertError
          }
        }
      }

      alert('Company settings saved successfully! Changes will be reflected across the application.')
      
      // Trigger events to notify other components (sidebar)
      if (typeof window !== 'undefined') {
        // Dispatch custom event to update sidebar immediately
        window.dispatchEvent(new CustomEvent('company-settings-updated'))
        // Update localStorage for immediate UI update
        if (companySettings.name) {
          localStorage.setItem('companyName', companySettings.name)
        }
      }
      
      // Refresh after a short delay to ensure all components are updated
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error: any) {
      console.error('Error saving company settings:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: any, type: string) => {
    setModalRole(type as any)
    setEditingItem(item)
    setShowUserModal(true)
  }

  const handleDelete = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return
    
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let table: string
      const isProfile = (type === 'installer' || type === 'manager' || type === 'accountant' || type === 'coordinator')
      if (isProfile) {
        // Use admin API route to delete auth+profile (bypasses RLS)
        const resp = await fetch('/api/users/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: id })
        })
        const result = await resp.json()
        if (!resp.ok) throw new Error(result.error || 'Failed to delete user')
      } else {
        if (type === 'location') table = 'locations'
        else if (type === 'vehicle_type') table = 'vehicle_types'
        else if (type === 'department') table = 'departments'
        else table = 'locations'
        
        // CRITICAL: Verify tenant_id before deleting for security
        if (!isSuper && tenantId) {
          // First verify this item belongs to current tenant
          const { data: existing, error: checkError } = await supabase
            .from(table)
            .select('tenant_id')
            .eq('id', id)
            .single()
          
          if (checkError) throw checkError
          
          if (existing.tenant_id !== tenantId) {
            alert('Cannot delete item from another tenant')
            return
          }
          
          // Delete with tenant_id filter for extra security
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId) // Extra security filter
          
          if (error) throw error
        } else {
          // Super admin delete
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id)
          
          if (error) throw error
        }
      }

      // Refresh data
      if (type === 'installer') {
        await fetchInstallers()
        await fetchUsers() // Also refresh main users list
      } else if (type === 'manager') {
        await fetchManagers()
        await fetchUsers()
      } else if (type === 'accountant' || type === 'coordinator') {
        await fetchAccountants()
        await fetchUsers() // Also refresh main users list
      } else if (type === 'location') {
        await fetchLocations()
      } else if (type === 'vehicle_type') {
        await fetchVehicleTypes()
      } else if (type === 'department') {
        await fetchDepartments()
      } else {
        await fetchLocations()
      }
      
      alert('Deleted successfully!')
    } catch (error: any) {
      alert(`Failed to delete: ${error.message}`)
    }
  }

  const handleToggleStatus = async (id: string, type: string) => {
    try {
      const tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      let table: string
      let currentItem: any
      
      // All user types are in profiles table
      if (type === 'installer' || type === 'manager' || type === 'accountant' || type === 'coordinator') {
        table = 'profiles'
        if (type === 'installer') currentItem = installers.find(i => i.id === id)
        else if (type === 'manager') currentItem = managers.find(m => m.id === id)
        else if (type === 'accountant') currentItem = accountants.find(a => a.id === id)
        else if (type === 'coordinator') currentItem = coordinators.find(c => c.id === id)
      } else if (type === 'location') {
        table = 'locations'
        currentItem = locations.find(l => l.id === id)
      } else if (type === 'vehicle_type') {
        table = 'vehicle_types'
        currentItem = vehicleTypes.find(v => v.id === id)
      } else if (type === 'department') {
        table = 'departments'
        currentItem = departments.find(d => d.id === id)
      } else {
        table = 'locations'
        currentItem = locations.find(l => l.id === id)
      }

      if (!currentItem) return

      const newStatus = currentItem.status === 'active' ? 'inactive' : 'active'
      
      // CRITICAL: For non-profile tables, verify tenant_id before updating
      if (table !== 'profiles' && !isSuper && tenantId) {
        // First verify this item belongs to current tenant
        const { data: existing, error: checkError } = await supabase
          .from(table)
          .select('tenant_id')
          .eq('id', id)
          .single()
        
        if (checkError) throw checkError
        
        if (existing.tenant_id !== tenantId) {
          alert('Cannot update status of item from another tenant')
          return
        }
        
        // Update with tenant_id filter for extra security
        const { error } = await supabase
          .from(table)
          .update({ status: newStatus })
          .eq('id', id)
          .eq('tenant_id', tenantId) // Extra security filter
        
        if (error) throw error
      } else {
        // For profiles or super admin, update without tenant filter
        const { error } = await supabase
          .from(table)
          .update({ status: newStatus })
          .eq('id', id)
        
        if (error) throw error
      }

      // Refresh data
      if (type === 'installer') await fetchInstallers()
      else if (type === 'manager') await fetchManagers()
      else if (type === 'accountant' || type === 'coordinator') await fetchAccountants()
      else if (type === 'location') await fetchLocations()
      else if (type === 'vehicle_type') await fetchVehicleTypes()
      else if (type === 'department') await fetchDepartments()
      else await fetchLocations()
      
      alert('Status updated successfully!')
    } catch (error: any) {
      alert(`Failed to update status: ${error.message}`)
    }
  }

  const handleModalSuccess = () => {
    fetchUsers()
    fetchManagers()
    fetchInstallers()
    fetchAccountants()
    setShowUserModal(false)
    setEditingItem(null)
  }

  // Handler for Vehicle Type form
  const handleSaveVehicleType = async () => {
    if (!vehicleTypeForm.name.trim()) {
      alert('Please enter a vehicle type name')
      return
    }

    try {
      let tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // CRITICAL: If tenant_id is missing, fetch it from user's tenant_users relationship
      if (!isSuper && !tenantId) {
        console.warn('ΓÜá∩╕Å tenant_id not found in sessionStorage, fetching from database...')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser?.tenant_id) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
            console.log('Γ£à tenant_id fetched and set:', tenantId)
          } else {
            alert('Cannot save vehicle type: Tenant ID is required. Please log out and log in again.')
            return
          }
        } else {
          alert('Cannot save vehicle type: Please log in again.')
          return
        }
      }
      
      // CRITICAL: Final validation - tenant_id MUST be set for tenant users
      if (!isSuper && !tenantId) {
        alert('Cannot save vehicle type: Tenant ID is required. Please log out and log in again.')
        return
      }
      
      console.log('≡ƒÆ╛ Creating/updating vehicle type:', {
        name: vehicleTypeForm.name,
        status: vehicleTypeForm.status,
        tenantId,
        isSuper,
        editingVehicleType: editingVehicleType?.id
      })
      
      if (editingVehicleType) {
        // Update existing - verify tenant_id matches for security
        if (!isSuper && tenantId) {
          // First verify this vehicle type belongs to current tenant
          const { data: existing, error: checkError } = await supabase
            .from('vehicle_types')
            .select('tenant_id')
            .eq('id', editingVehicleType.id)
            .single()
          
          if (checkError) throw checkError
          
          if (existing.tenant_id !== tenantId) {
            alert('Cannot update vehicle type from another tenant')
            return
          }
          
          // Update with tenant_id filter for extra security
          const { error } = await supabase
            .from('vehicle_types')
            .update({ name: vehicleTypeForm.name, status: vehicleTypeForm.status })
            .eq('id', editingVehicleType.id)
            .eq('tenant_id', tenantId) // Extra security filter
        
          if (error) throw error
        } else {
          // Super admin update
          const { error } = await supabase
            .from('vehicle_types')
            .update({ name: vehicleTypeForm.name, status: vehicleTypeForm.status })
            .eq('id', editingVehicleType.id)
          
          if (error) throw error
        }
        
        alert('Vehicle type updated successfully!')
      } else {
        // Create new - CRITICAL: Include tenant_id
        const insertData: any = {
          name: vehicleTypeForm.name,
          status: vehicleTypeForm.status
        }
        
        // Add tenant_id for tenant users (super admin can have null tenant_id)
        if (!isSuper && tenantId) {
          insertData.tenant_id = tenantId
        }
        
        console.log('≡ƒôñ INSERTING vehicle_type with data:', JSON.stringify(insertData, null, 2))
        
        const { data: insertedData, error } = await supabase
          .from('vehicle_types')
          .insert([insertData])
          .select('id, name, tenant_id')
        
        if (insertedData) {
          console.log('Γ£à INSERTED vehicle_type:', JSON.stringify(insertedData[0], null, 2))
        }
        
        if (error) throw error
        alert('Vehicle type created successfully!')
      }
      
      await fetchVehicleTypes()
      setShowVehicleTypeForm(false)
      setEditingVehicleType(null)
      setVehicleTypeForm({ name: '', status: 'active' })
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`)
    }
  }

  // Handler for Department form
  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) {
      alert('Please enter a department name')
      return
    }

    try {
      let tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // CRITICAL: If tenant_id is missing, fetch it from user's tenant_users relationship
      if (!isSuper && !tenantId) {
        console.warn('ΓÜá∩╕Å tenant_id not found in sessionStorage, fetching from database...')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser?.tenant_id) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
            console.log('Γ£à tenant_id fetched and set:', tenantId)
          } else {
            alert('Cannot save department: Tenant ID is required. Please log out and log in again.')
            return
          }
        } else {
          alert('Cannot save department: Please log in again.')
          return
        }
      }
      
      // CRITICAL: Final validation - tenant_id MUST be set for tenant users
      if (!isSuper && !tenantId) {
        alert('Cannot save department: Tenant ID is required. Please log out and log in again.')
        return
      }
      
      console.log('≡ƒÆ╛ Creating/updating department:', {
        name: departmentForm.name,
        status: departmentForm.status,
        color: departmentForm.color,
        tenantId,
        isSuper,
        editingDepartment: editingDepartment?.id
      })
      
      if (editingDepartment) {
        // Update existing - verify tenant_id matches for security
        if (!isSuper && tenantId) {
          // First verify this department belongs to current tenant
          const { data: existing, error: checkError } = await supabase
            .from('departments')
            .select('tenant_id')
            .eq('id', editingDepartment.id)
            .single()
          
          if (checkError) throw checkError
          
          if (existing.tenant_id !== tenantId) {
            alert('Cannot update department from another tenant')
            return
          }
          
          // Update with tenant_id filter for extra security
          const { error } = await supabase
            .from('departments')
            .update({ 
              name: departmentForm.name, 
              status: departmentForm.status, 
              color: departmentForm.color 
            })
            .eq('id', editingDepartment.id)
            .eq('tenant_id', tenantId) // Extra security filter
        
          if (error) throw error
        } else {
          // Super admin update
          const { error } = await supabase
            .from('departments')
            .update({ 
              name: departmentForm.name, 
              status: departmentForm.status, 
              color: departmentForm.color 
            })
            .eq('id', editingDepartment.id)
          
          if (error) throw error
        }
        
        alert('Department updated successfully!')
      } else {
        // Create new - CRITICAL: Include tenant_id
        const insertData: any = {
          name: departmentForm.name,
          status: departmentForm.status,
          color: departmentForm.color
        }
        
        // Add tenant_id for tenant users (super admin can have null tenant_id)
        if (!isSuper && tenantId) {
          insertData.tenant_id = tenantId
        }
        
        console.log('≡ƒôñ INSERTING department with data:', JSON.stringify(insertData, null, 2))
        
        const { data: insertedData, error } = await supabase
          .from('departments')
          .insert([insertData])
          .select('id, name, tenant_id')
        
        if (insertedData) {
          console.log('Γ£à INSERTED department:', JSON.stringify(insertedData[0], null, 2))
        }
        
        if (error) throw error
        alert('Department created successfully!')
      }
      
      await fetchDepartments()
      setShowDepartmentForm(false)
      setEditingDepartment(null)
      setDepartmentForm({ name: '', status: 'active', color: '#3b82f6' })
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`)
    }
  }

  // Handler for Location form
  const handleSaveLocation = async () => {
    if (!locationForm.name.trim()) {
      alert('Please enter a location name')
      return
    }

    try {
      let tenantId = getCurrentTenantId()
      const isSuper = isSuperAdmin()
      
      // CRITICAL: If tenant_id is missing, fetch it from user's tenant_users relationship
      if (!isSuper && !tenantId) {
        console.warn('ΓÜá∩╕Å tenant_id not found in sessionStorage, fetching from database...')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: tenantUser } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single()
          
          if (tenantUser?.tenant_id) {
            tenantId = tenantUser.tenant_id
            sessionStorage.setItem('current_tenant_id', tenantId)
            console.log('Γ£à tenant_id fetched and set:', tenantId)
          } else {
            alert('Cannot save location: Tenant ID is required. Please log out and log in again.')
            return
          }
        } else {
          alert('Cannot save location: Please log in again.')
          return
        }
      }
      
      // CRITICAL: Final validation - tenant_id MUST be set for tenant users
      if (!isSuper && !tenantId) {
        alert('Cannot save location: Tenant ID is required. Please log out and log in again.')
        return
      }
      
      console.log('≡ƒÆ╛ Creating/updating location:', {
        name: locationForm.name,
        address: locationForm.address,
        status: locationForm.status,
        tenantId,
        isSuper,
        editingLocation: editingLocation?.id
      })
      
      if (editingLocation) {
        // Update existing - verify tenant_id matches for security
        if (!isSuper && tenantId) {
          // First verify this location belongs to current tenant
          const { data: existing, error: checkError } = await supabase
            .from('locations')
            .select('tenant_id')
            .eq('id', editingLocation.id)
            .single()
          
          if (checkError) throw checkError
          
          if (existing.tenant_id !== tenantId) {
            alert('Cannot update location from another tenant')
            return
          }
          
          // Update with tenant_id filter for extra security
          const { error } = await supabase
            .from('locations')
            .update({ 
              name: locationForm.name, 
              address: locationForm.address,
              status: locationForm.status 
            })
            .eq('id', editingLocation.id)
            .eq('tenant_id', tenantId) // Extra security filter
        
          if (error) throw error
        } else {
          // Super admin update
          const { error } = await supabase
            .from('locations')
            .update({ 
              name: locationForm.name, 
              address: locationForm.address,
              status: locationForm.status 
            })
            .eq('id', editingLocation.id)
          
          if (error) throw error
        }
        
        alert('Location updated successfully!')
      } else {
        // Create new - CRITICAL: Include tenant_id
        const insertData: any = {
          name: locationForm.name,
          address: locationForm.address,
          status: locationForm.status
        }
        
        // Add tenant_id for tenant users (super admin can have null tenant_id)
        if (!isSuper && tenantId) {
          insertData.tenant_id = tenantId
        }
        
        console.log('≡ƒôñ INSERTING location with data:', JSON.stringify(insertData, null, 2))
        
        const { data: insertedData, error } = await supabase
          .from('locations')
          .insert([insertData])
          .select('id, name, tenant_id')
        
        if (insertedData) {
          console.log('Γ£à INSERTED location:', JSON.stringify(insertedData[0], null, 2))
        }
        
        if (error) throw error
        alert('Location created successfully!')
      }
      
      await fetchLocations()
      setShowLocationForm(false)
      setEditingLocation(null)
      setLocationForm({ name: '', address: '', status: 'active' })
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`)
    }
  }

  return (
    <>
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .settings-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .settings-tabs-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div style={{ 
        padding: isMobile ? '1rem' : '2rem', 
        backgroundColor: '#f8fafc', 
        minHeight: '100vh' 
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
          <h1 style={{ 
            fontSize: isMobile ? '1.5rem' : '2rem', 
            fontWeight: 'bold', 
            color: '#1e293b', 
            marginBottom: '0.5rem' 
          }}>
            Settings
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Manage your account and system settings
          </p>
          </div>

          {/* Tabs */}
          <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '0.5rem', 
          padding: isMobile ? '0.75rem' : '1rem', 
          marginBottom: isMobile ? '1rem' : '2rem', 
          border: '1px solid #e2e8f0' 
        }}>
          <div className="settings-tabs-scroll" style={{ 
            display: 'flex', 
            gap: isMobile ? '0.5rem' : '1rem', 
            borderBottom: '1px solid #e2e8f0', 
            paddingBottom: '1rem', 
            marginBottom: '1rem',
            overflowX: isMobile ? 'auto' : 'visible',
            WebkitOverflowScrolling: 'touch'
          }}>
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                  padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                border: 'none',
                  backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                  borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <tab.icon style={{ width: isMobile ? '0.875rem' : '1rem', height: isMobile ? '0.875rem' : '1rem' }} />
              {tab.label}
            </button>
          ))}
          </div>

          {/* Management Sub-tabs */}
          {activeTab === 'management' && (
            <div className="settings-tabs-scroll" style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '1rem', 
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              overflowX: isMobile ? 'auto' : 'visible',
              WebkitOverflowScrolling: 'touch'
            }}>
              {['installers', 'managers', 'accountants', 'coordinator', 'locations', 'vehicle_types', 'departments'].map((tab) => (
                  <button
                  key={tab}
                  onClick={() => setManagementTab(tab)}
                    style={{
                      padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                    backgroundColor: managementTab === tab ? '#2563eb' : 'white',
                    color: managementTab === tab ? 'white' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: isMobile ? '0.8125rem' : '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                                  }}
                                >
                  {tab === 'vehicle_types' ? 'Vehicle Types' : tab === 'departments' ? 'Departments' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
              ))}
                </div>
              )}

              {/* Installers Management */}
          {activeTab === 'management' && managementTab === 'installers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Installers Management</h3>
                    <button
                      onClick={() => {
                        setModalRole('installer')
                        setEditingItem(null)
                        setShowUserModal(true)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center', gap: '0.5rem'
                      }}
                    >
                      <Plus style={{ width: '1rem', height: '1rem' }} />
                      Add Installer
                    </button>
                  </div>
                  <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    overflow: isMobile ? 'auto' : 'hidden'
                  }}>
                    <div style={{ 
                      overflowX: isMobile ? 'auto' : 'visible',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      minWidth: isMobile ? '600px' : 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ display: 'none' }}>ID</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Email</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Phone</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                    {installers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No installers found. Click "Add Installer" to create one.
                            </td>
                          </tr>
                    ) : (
                      installers.map((installer, index) => (
                        <tr key={installer.id} style={{ borderBottom: index === installers.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ display: 'none' }}></td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {installer.name || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {installer.email || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {installer.phone || '-'}
                          </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                              backgroundColor: (installer.status === 'active' || !installer.status) ? '#dcfce7' : '#fef2f2',
                              color: (installer.status === 'active' || !installer.status) ? '#166534' : '#dc2626'
                              }}>
                              {installer.status || 'active'}
                              </span>
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {installer.created_at ? new Date(installer.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                onClick={() => handleEdit(installer, 'installer')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                                <button
                                onClick={() => handleToggleStatus(installer.id, 'installer')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                  backgroundColor: installer.status === 'active' ? '#f59e0b' : '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                {installer.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                onClick={() => handleDelete(installer.id, 'installer')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

              {/* Accountants Management */}
          {activeTab === 'management' && managementTab === 'accountants' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Accountants Management</h3>
                    <button
                      onClick={() => {
                        setModalRole('accountant')
                        setEditingItem(null)
                        setShowUserModal(true)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Plus style={{ width: '1rem', height: '1rem' }} />
                      Add Accountant
                    </button>
                  </div>
                  <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    overflow: isMobile ? 'auto' : 'hidden'
                  }}>
                    <div style={{ 
                      overflowX: isMobile ? 'auto' : 'visible',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      minWidth: isMobile ? '600px' : 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ display: 'none' }}>ID</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Email</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Phone</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                    {accountants.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No accountants found. Click "Add Accountant" to create one.
                            </td>
                          </tr>
                    ) : (
                      accountants.map((accountant, index) => (
                        <tr key={accountant.id} style={{ borderBottom: index === accountants.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ display: 'none' }}></td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {accountant.name || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {accountant.email || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {accountant.phone || '-'}
                          </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                              backgroundColor: (accountant.status === 'active' || !accountant.status) ? '#dcfce7' : '#fef2f2',
                              color: (accountant.status === 'active' || !accountant.status) ? '#166534' : '#dc2626'
                              }}>
                              {accountant.status || 'active'}
                              </span>
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {accountant.created_at ? new Date(accountant.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                onClick={() => handleEdit(accountant, 'accountant')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                                <button
                                onClick={() => handleToggleStatus(accountant.id, 'accountant')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                  backgroundColor: accountant.status === 'active' ? '#f59e0b' : '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                {accountant.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                onClick={() => handleDelete(accountant.id, 'accountant')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

              {/* Coordinators Management */}
          {activeTab === 'management' && managementTab === 'coordinator' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Coordinators Management</h3>
                    <button
                      onClick={() => {
                        setModalRole('coordinator')
                        setEditingItem(null)
                        setShowUserModal(true)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Plus style={{ width: '1rem', height: '1rem' }} />
                      Add Coordinator
                    </button>
                  </div>
                  <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    overflow: isMobile ? 'auto' : 'hidden'
                  }}>
                    <div style={{ 
                      overflowX: isMobile ? 'auto' : 'visible',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      minWidth: isMobile ? '600px' : 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ display: 'none' }}>ID</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Email</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Phone</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                    {coordinators.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No coordinators found. Click "Add Coordinator" to create one.
                            </td>
                          </tr>
                    ) : (
                      coordinators.map((coordinator, index) => (
                        <tr key={coordinator.id} style={{ borderBottom: index === coordinators.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ display: 'none' }}></td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {coordinator.name || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {coordinator.email || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {coordinator.phone || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                              backgroundColor: (coordinator.status === 'active' || !coordinator.status) ? '#dcfce7' : '#fef2f2',
                              color: (coordinator.status === 'active' || !coordinator.status) ? '#166534' : '#dc2626'
                              }}>
                              {coordinator.status || 'active'}
                              </span>
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {coordinator.created_at ? new Date(coordinator.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                onClick={() => handleEdit(coordinator, 'coordinator')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                                <button
                                onClick={() => handleToggleStatus(coordinator.id, 'coordinator')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                  backgroundColor: coordinator.status === 'active' ? '#f59e0b' : '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                {coordinator.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                onClick={() => handleDelete(coordinator.id, 'coordinator')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

              {/* Managers Management */}
          {activeTab === 'management' && managementTab === 'managers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Managers Management</h3>
                    <button
                      onClick={() => {
                        setModalRole('manager')
                        setEditingItem(null)
                        setShowUserModal(true)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Plus style={{ width: '1rem', height: '1rem' }} />
                      Add Manager
                    </button>
                  </div>
                  <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem', 
                    border: '1px solid #e2e8f0', 
                    overflow: isMobile ? 'auto' : 'hidden'
                  }}>
                    <div style={{ 
                      overflowX: isMobile ? 'auto' : 'visible',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      minWidth: isMobile ? '600px' : 'auto'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ display: 'none' }}>ID</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Phone</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Department</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Join Date</th>
                          <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                    {managers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No managers found. Click "Add Manager" to create one.
                            </td>
                          </tr>
                    ) : (
                      managers.map((manager, index) => (
                        <tr key={manager.id} style={{ borderBottom: index === managers.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ display: 'none' }}></td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {manager.name || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {manager.phone || manager.email || '-'}
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {getDepartmentNames(manager.department)}
                          </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                              backgroundColor: (manager.status === 'active' || !manager.status) ? '#dcfce7' : '#fef2f2',
                              color: (manager.status === 'active' || !manager.status) ? '#166534' : '#dc2626'
                              }}>
                              {manager.status || 'active'}
                              </span>
                            </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {manager.created_at ? new Date(manager.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                onClick={() => handleEdit(manager, 'manager')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                                <button
                                onClick={() => handleToggleStatus(manager.id, 'manager')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                  backgroundColor: manager.status === 'active' ? '#f59e0b' : '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                {manager.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                onClick={() => handleDelete(manager.id, 'manager')}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

          {/* Locations Management */}
          {activeTab === 'management' && managementTab === 'locations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Locations Management</h3>
                <button
                  onClick={() => {
                    setEditingLocation(null)
                    setLocationForm({ name: '', address: '', status: 'active' })
                    setShowLocationForm(true)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Plus style={{ width: '1rem', height: '1rem' }} />
                  Add Location
                </button>
              </div>
              
              {showLocationForm && (
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                    {editingLocation ? 'Edit Location' : 'Add New Location'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Location Name *
                      </label>
                      <input
                        type="text"
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                        placeholder="e.g., Main Branch, Workshop 1"
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
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Status
                      </label>
                      <select
                        value={locationForm.status}
                        onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value })}
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
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Address
                    </label>
                    <textarea
                      value={locationForm.address}
                      onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                      placeholder="Enter location address"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowLocationForm(false)
                        setEditingLocation(null)
                        setLocationForm({ name: '', address: '', status: 'active' })
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLocation}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {editingLocation ? 'Update' : 'Save'} Location
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                border: '1px solid #e2e8f0', 
                overflow: isMobile ? 'auto' : 'hidden'
              }}>
                <div style={{ 
                  overflowX: isMobile ? 'auto' : 'visible',
                  WebkitOverflowScrolling: 'touch'
                }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: isMobile ? '600px' : 'auto'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Address</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No locations found. Click "Add Location" to create one.
                        </td>
                      </tr>
                    ) : (
                      locations.map((location, index) => (
                        <tr key={location.id} style={{ borderBottom: index === locations.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {location.name || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {location.address || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: (location.status === 'active' || !location.status) ? '#dcfce7' : '#fef2f2',
                              color: (location.status === 'active' || !location.status) ? '#166534' : '#dc2626'
                            }}>
                              {location.status || 'active'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {location.created_at ? new Date(location.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingLocation(location)
                                  setLocationForm({
                                    name: location.name || '',
                                    address: location.address || '',
                                    status: location.status || 'active'
                                  })
                                  setShowLocationForm(true)
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(location.id, 'location')}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: location.status === 'active' ? '#f59e0b' : '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {location.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDelete(location.id, 'location')}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

          {/* Vehicle Types Management */}
          {activeTab === 'management' && managementTab === 'vehicle_types' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Vehicle Types Management</h3>
                <button
                  onClick={() => {
                    setEditingVehicleType(null)
                    setVehicleTypeForm({ name: '', status: 'active' })
                    setShowVehicleTypeForm(true)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Plus style={{ width: '1rem', height: '1rem' }} />
                  Add Vehicle Type
                </button>
              </div>
              
              {showVehicleTypeForm && (
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                    {editingVehicleType ? 'Edit Vehicle Type' : 'Add New Vehicle Type'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Vehicle Type Name *
                      </label>
                      <input
                        type="text"
                        value={vehicleTypeForm.name}
                        onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, name: e.target.value })}
                        placeholder="e.g., Retail, Showroom"
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
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Status
                      </label>
                      <select
                        value={vehicleTypeForm.status}
                        onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, status: e.target.value })}
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
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowVehicleTypeForm(false)
                        setEditingVehicleType(null)
                        setVehicleTypeForm({ name: '', status: 'active' })
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveVehicleType}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {editingVehicleType ? 'Update' : 'Save'} Vehicle Type
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                border: '1px solid #e2e8f0', 
                overflow: isMobile ? 'auto' : 'hidden'
              }}>
                <div style={{ 
                  overflowX: isMobile ? 'auto' : 'visible',
                  WebkitOverflowScrolling: 'touch'
                }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: isMobile ? '600px' : 'auto'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleTypes.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No vehicle types found. Click "Add Vehicle Type" to create one.
                        </td>
                      </tr>
                    ) : (
                      vehicleTypes.map((vehicleType, index) => (
                        <tr key={vehicleType.id} style={{ borderBottom: index === vehicleTypes.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {vehicleType.name || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: (vehicleType.status === 'active' || !vehicleType.status) ? '#dcfce7' : '#fef2f2',
                              color: (vehicleType.status === 'active' || !vehicleType.status) ? '#166534' : '#dc2626'
                            }}>
                              {vehicleType.status || 'active'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {vehicleType.created_at ? new Date(vehicleType.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingVehicleType(vehicleType)
                                  setVehicleTypeForm({
                                    name: vehicleType.name || '',
                                    status: vehicleType.status || 'active'
                                  })
                                  setShowVehicleTypeForm(true)
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(vehicleType.id, 'vehicle_type')}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: vehicleType.status === 'active' ? '#f59e0b' : '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {vehicleType.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDelete(vehicleType.id, 'vehicle_type')}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

          {/* Departments Management */}
          {activeTab === 'management' && managementTab === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Departments Management</h3>
                <button
                  onClick={() => {
                    setEditingDepartment(null)
                    setDepartmentForm({ name: '', status: 'active', color: '#3b82f6' })
                    setShowDepartmentForm(true)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Plus style={{ width: '1rem', height: '1rem' }} />
                  Add Department
                </button>
              </div>
              
              {showDepartmentForm && (
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                    {editingDepartment ? 'Edit Department' : 'Add New Department'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Department Name *
                      </label>
                      <input
                        type="text"
                        value={departmentForm.name}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                        placeholder="e.g., Engine, Electrical, Body & Paint"
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
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Status
                      </label>
                      <select
                        value={departmentForm.status}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, status: e.target.value })}
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
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Department Color *
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={departmentForm.color}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, color: e.target.value })}
                        style={{
                          width: '60px',
                          height: '40px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          cursor: 'pointer'
                        }}
                      />
                      <input
                        type="text"
                        value={departmentForm.color}
                        onChange={(e) => setDepartmentForm({ ...departmentForm, color: e.target.value })}
                        placeholder="#3b82f6"
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {['#3b82f6', '#059669', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setDepartmentForm({ ...departmentForm, color })}
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: color,
                            border: departmentForm.color === color ? '2px solid #1e293b' : '2px solid #e2e8f0',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            boxShadow: departmentForm.color === color ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowDepartmentForm(false)
                        setEditingDepartment(null)
                        setDepartmentForm({ name: '', status: 'active', color: '#3b82f6' })
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDepartment}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      {editingDepartment ? 'Update' : 'Save'} Department
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.5rem', 
                border: '1px solid #e2e8f0', 
                overflow: isMobile ? 'auto' : 'hidden'
              }}>
                <div style={{ 
                  overflowX: isMobile ? 'auto' : 'visible',
                  WebkitOverflowScrolling: 'touch'
                }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: isMobile ? '600px' : 'auto'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Color</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No departments found. Click "Add Department" to create one.
                        </td>
                      </tr>
                    ) : (
                      departments.map((department, index) => (
                        <tr key={department.id} style={{ borderBottom: index === departments.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                            {department.name || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  backgroundColor: department.color || '#3b82f6',
                                  borderRadius: '0.375rem',
                                  border: '1px solid #e2e8f0',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                title={department.color || '#3b82f6'}
                              />
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                                {department.color || '#3b82f6'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              backgroundColor: (department.status === 'active' || !department.status) ? '#dcfce7' : '#fef2f2',
                              color: (department.status === 'active' || !department.status) ? '#166534' : '#dc2626'
                            }}>
                              {department.status || 'active'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>
                            {department.created_at ? new Date(department.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => {
                                  setEditingDepartment(department)
                                  setDepartmentForm({ name: department.name || '', status: department.status || 'active', color: department.color || '#3b82f6' })
                                  setShowDepartmentForm(true)
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(department.id, 'department')}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: department.status === 'active' ? '#f59e0b' : '#059669',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {department.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDelete(department.id, 'department')}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                      </tbody>
                    </table>
                    </div>
                  </div>
            </div>
          )}

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Admin Profile</h3>
                <button
                  onClick={saveProfileSettings}
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: saving ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save style={{ width: '1rem', height: '1rem' }} />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={profileSettings.name}
                      onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
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
                      Email Address * <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(Working & User ID)</span>
                    </label>
                    <input
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                    {currentUser && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        User ID: {currentUser.id?.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                  
                  {/* Designation - Read-only */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Designation <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(Protected - Cannot be changed)</span>
                    </label>
                    <input
                      type="text"
                      value="Admin"
                      readOnly
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        cursor: 'not-allowed'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      This is the first user of OMS and cannot be modified or deleted.
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Section - Most Important */}
              <div style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0, marginBottom: '0.25rem' }}>Change Password</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Update your account password to keep your account secure</p>
                  </div>
                </div>
                
                <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    backgroundColor: '#fef3c7', 
                    border: '1px solid #fbbf24',
                    borderRadius: '0.375rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <HelpCircle style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#92400e' }}>Security Tips</span>
                    </div>
                    <ul style={{ fontSize: '0.75rem', color: '#78350f', margin: '0.25rem 0 0 1.5rem', padding: 0 }}>
                      <li>Use at least 8 characters</li>
                      <li>Include uppercase letters, lowercase letters, and numbers</li>
                      <li>Avoid using personal information</li>
                      <li>Don't reuse passwords from other accounts</li>
                    </ul>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                    {/* New Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        New Password * <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(min 8 characters)</span>
                      </label>
                      <input
                        type="password"
                        value={passwordSettings.newPassword}
                        onChange={(e) => setPasswordSettings({ ...passwordSettings, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: passwordSettings.newPassword && passwordSettings.newPassword.length < 8 ? '1px solid #ef4444' : '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                      {passwordSettings.newPassword && passwordSettings.newPassword.length < 8 && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                          Password must be at least 8 characters long
                        </div>
                      )}
                    </div>
                    
                    {/* Confirm Password */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        value={passwordSettings.confirmPassword}
                        onChange={(e) => setPasswordSettings({ ...passwordSettings, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: passwordSettings.confirmPassword && passwordSettings.newPassword !== passwordSettings.confirmPassword ? '1px solid #ef4444' : '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                      {passwordSettings.confirmPassword && passwordSettings.newPassword !== passwordSettings.confirmPassword && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                          Passwords do not match
                        </div>
                      )}
                      {passwordSettings.confirmPassword && passwordSettings.newPassword === passwordSettings.confirmPassword && passwordSettings.newPassword.length >= 8 && (
                        <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                          <CheckCircle style={{ width: '0.75rem', height: '0.75rem', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                          Passwords match
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      onClick={() => setPasswordSettings({ newPassword: '', confirmPassword: '' })}
                      disabled={changingPassword}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'transparent',
                        color: '#64748b',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: changingPassword ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={changePassword}
                      disabled={changingPassword || !passwordSettings.newPassword || !passwordSettings.confirmPassword || passwordSettings.newPassword.length < 8 || passwordSettings.newPassword !== passwordSettings.confirmPassword}
                      style={{
                        padding: '0.5rem 1.5rem',
                        backgroundColor: (changingPassword || !passwordSettings.newPassword || !passwordSettings.confirmPassword || passwordSettings.newPassword.length < 8 || passwordSettings.newPassword !== passwordSettings.confirmPassword) ? '#9ca3af' : '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: (changingPassword || !passwordSettings.newPassword || !passwordSettings.confirmPassword || passwordSettings.newPassword.length < 8 || passwordSettings.newPassword !== passwordSettings.confirmPassword) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Save style={{ width: '1rem', height: '1rem' }} />
                      {changingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Settings */}
          {activeTab === 'company' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Company Information</h3>
                <button
                  onClick={saveCompanySettings}
                  disabled={saving || ['installer','coordinator','manager','accountant'].includes(userRole)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: (saving || ['installer','coordinator','manager','accountant'].includes(userRole)) ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: (saving || ['installer','coordinator','manager','accountant'].includes(userRole)) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save style={{ width: '1rem', height: '1rem' }} />
                  {saving ? 'Saving...' : 'Save Company'}
                </button>
              </div>
              
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  {/* Company Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companySettings.name}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, name: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
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
                  
                  {/* Address - Full width */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Address *
                    </label>
                    <textarea
                      value={companySettings.address}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, address: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  
                  {/* Phone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={companySettings.phone}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, phone: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
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
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, email: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      placeholder="info@zoravo.in"
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
                  
                  {/* Website */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Website
                    </label>
                    <input
                      type="url"
                      value={companySettings.website}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, website: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      placeholder="https://www.example.com"
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
                  
                  {/* Business Hours */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Business Hours
                    </label>
                    <input
                      type="text"
                      value={companySettings.businessHours}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, businessHours: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      placeholder="e.g., Open - Closes 7 pm"
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
                  
                  {/* Opening Time */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={companySettings.openingTime}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, openingTime: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
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
                  
                  {/* Closing Time */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={companySettings.closingTime}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, closingTime: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
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
                  
                  {/* GST Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={companySettings.gstNumber}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, gstNumber: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      placeholder="e.g., 27AABCU9603R1ZM"
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
                  
                  {/* PAN Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={companySettings.panNumber}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, panNumber: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      placeholder="e.g., ABCDE1234F"
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
                  
                  {/* Registration Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={companySettings.registrationNumber}
                      onChange={(e) => (userRole !== 'installer' && userRole !== 'coordinator' && userRole !== 'manager') && setCompanySettings({ ...companySettings, registrationNumber: e.target.value })}
                      disabled={userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager'}
                      placeholder="Company registration number"
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
            </div>
          )}

          {/* WhatsApp Notifications Tab */}
          {activeTab === 'notifications' && userRole === 'admin' && (
            <div style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
                  WhatsApp Notifications
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Configure WhatsApp notifications for workflow events
                </p>
              </div>

              {/* WhatsApp Configuration */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare style={{ width: '1.25rem', height: '1.25rem' }} />
                  WhatsApp Configuration
                </h3>

                {/* Enable/Disable Toggle */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                      Enable WhatsApp Notifications
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Turn on WhatsApp notifications for workflow events
                    </div>
                  </div>
                  <button
                    onClick={() => setWhatsappConfig({ ...whatsappConfig, enabled: !whatsappConfig.enabled })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: whatsappConfig.enabled ? '#059669' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    {whatsappConfig.enabled ? (
                      <>
                        <ToggleRight style={{ width: '1.25rem', height: '1.25rem' }} />
                        Enabled
                      </>
                    ) : (
                      <>
                        <ToggleLeft style={{ width: '1.25rem', height: '1.25rem' }} />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                {whatsappConfig.enabled && (
                  <>
                    {/* Provider Selection */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                        Provider
                      </label>
                      <select
                        value={whatsappConfig.provider}
                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, provider: e.target.value as any })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      >
                        <option value="messageautosender">MessageAutoSender</option>
                        <option value="twilio">Twilio</option>
                        <option value="cloud-api">WhatsApp Cloud API</option>
                        <option value="custom">Custom Webhook</option>
                      </select>
                    </div>

                    {/* MessageAutoSender Settings */}
                    {whatsappConfig.provider === 'messageautosender' && (
                      <>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            User ID <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={whatsappConfig.userId || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, userId: e.target.value })}
                            placeholder="Your MessageAutoSender User ID"
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
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            Password <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="password"
                            value={whatsappConfig.password || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, password: e.target.value })}
                            placeholder="Your MessageAutoSender Password"
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
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            API Key <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={whatsappConfig.apiKey || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })}
                            placeholder="Your MessageAutoSender API Key"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              outline: 'none'
                            }}
                          />
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Get your API key from MessageAutoSender dashboard
                          </div>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            API Endpoint URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={whatsappConfig.webhookUrl || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhookUrl: e.target.value })}
                            placeholder="https://app.messageautosender.com/api/whatsapp/send"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              outline: 'none'
                            }}
                          />
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Leave empty to use default endpoint. Customize if your API endpoint is different.
                          </div>
                        </div>
                      </>
                    )}

                    {/* From Number (not required for MessageAutoSender) */}
                    {whatsappConfig.provider !== 'messageautosender' && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                          WhatsApp Number (From) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                      <input
                        type="text"
                        value={whatsappConfig.fromNumber || ''}
                        onChange={(e) => setWhatsappConfig({ ...whatsappConfig, fromNumber: e.target.value })}
                        placeholder="+919876543210 (with country code)"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Format: +[country code][number] (e.g., +919876543210)
                        </div>
                      </div>
                    )}

                    {/* Twilio Settings */}
                    {whatsappConfig.provider === 'twilio' && (
                      <>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            Account SID <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={whatsappConfig.accountSid || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, accountSid: e.target.value })}
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            Auth Token <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="password"
                            value={whatsappConfig.authToken || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, authToken: e.target.value })}
                            placeholder="Your Twilio Auth Token"
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
                      </>
                    )}

                    {/* WhatsApp Cloud API Settings */}
                    {whatsappConfig.provider === 'cloud-api' && (
                      <>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            Business Account ID <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={whatsappConfig.businessAccountId || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, businessAccountId: e.target.value })}
                            placeholder="Your WhatsApp Business Account ID"
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
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            Access Token <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="password"
                            value={whatsappConfig.accessToken || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })}
                            placeholder="Your WhatsApp Access Token"
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
                      </>
                    )}

                    {/* Custom Webhook Settings */}
                    {whatsappConfig.provider === 'custom' && (
                      <>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            Webhook URL <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="url"
                            value={whatsappConfig.webhookUrl || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, webhookUrl: e.target.value })}
                            placeholder="https://your-api.com/whatsapp/send"
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
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            API Key (Optional)
                          </label>
                          <input
                            type="text"
                            value={whatsappConfig.apiKey || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })}
                            placeholder="Your API Key"
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
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                            API Secret (Optional)
                          </label>
                          <input
                            type="password"
                            value={whatsappConfig.apiSecret || ''}
                            onChange={(e) => setWhatsappConfig({ ...whatsappConfig, apiSecret: e.target.value })}
                            placeholder="Your API Secret"
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
                      </>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        onClick={saveWhatsappSettings}
                        disabled={savingWhatsapp}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: savingWhatsapp ? 'not-allowed' : 'pointer',
                          opacity: savingWhatsapp ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Save style={{ width: '1rem', height: '1rem' }} />
                        {savingWhatsapp ? 'Saving...' : 'Save Configuration'}
                      </button>
                      
                      <button
                        onClick={async () => {
                          if (!whatsappConfig.enabled) {
                            alert('Please enable WhatsApp notifications first')
                            return
                          }
                          
                          try {
                            const { whatsappService } = await import('@/lib/whatsapp-service')
                            const { notificationWorkflow } = await import('@/lib/notification-workflow')
                            
                            // Initialize with current config
                            await whatsappService.initialize(whatsappConfig)
                            
                            // Send test notification to enabled users
                            const enabledUsers = notificationPreferences.filter(p => p.whatsapp_enabled && p.phone_number)
                            
                            if (enabledUsers.length === 0) {
                              alert('No users have WhatsApp notifications enabled. Please enable notifications for at least one user in the "Notification Preferences by Role" section.')
                              return
                            }
                            
                            const testEvent = {
                              type: 'vehicle_inward_created' as const,
                              vehicleId: 'test-vehicle-id',
                              vehicleNumber: 'TEST-123',
                              customerName: 'Test Customer',
                            }
                            
                            const recipients = enabledUsers
                              .filter(p => p.phone_number)
                              .map(p => ({
                                userId: p.user_id,
                                role: p.role as any,
                                phoneNumber: p.phone_number!,
                                name: users.find(u => u.id === p.user_id)?.name || 'User'
                              }))
                            
                            const result = await whatsappService.sendWorkflowNotification(testEvent, recipients, supabase)
                            
                            if (result.sent > 0) {
                              alert(`Γ£à Test notification sent successfully!\n\nSent: ${result.sent}\nFailed: ${result.failed}\n\nCheck your browser console (F12) for detailed logs.`)
                            } else {
                              alert(`Γ¥î Test notification failed!\n\nSent: ${result.sent}\nFailed: ${result.failed}\n\nErrors:\n${result.errors.join('\n')}\n\nCheck your browser console (F12) for detailed logs.`)
                            }
                          } catch (error: any) {
                            console.error('Test notification error:', error)
                            alert(`Failed to send test notification: ${error.message}\n\nCheck your browser console (F12) for details.`)
                          }
                        }}
                        disabled={savingWhatsapp || !whatsappConfig.enabled}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: whatsappConfig.enabled ? '#059669' : '#9ca3af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: (savingWhatsapp || !whatsappConfig.enabled) ? 'not-allowed' : 'pointer',
                          opacity: (savingWhatsapp || !whatsappConfig.enabled) ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <MessageSquare style={{ width: '1rem', height: '1rem' }} />
                        Send Test Notification
                      </button>
                    </div>
                    
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '0.75rem', 
                      backgroundColor: '#fef3c7', 
                      borderRadius: '0.5rem',
                      border: '1px solid #fde68a',
                      fontSize: '0.75rem',
                      color: '#92400e'
                    }}>
                      <strong>💡 Tip:</strong> Click "Send Test Notification" to verify your configuration works. Check the browser console (F12) for detailed logs.
                    </div>
                  </>
                )}
              </div>

              {/* Notification Preferences by Role */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Smartphone style={{ width: '1.25rem', height: '1.25rem' }} />
                  Notification Preferences by Role
                </h3>

                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  Configure which events trigger notifications for each role. Ensure users have phone numbers in their profiles.
                </div>

                {['installer', 'coordinator', 'accountant', 'manager'].map((role) => {
                  const roleUsers = users.filter(u => u.role === role)
                  return (
                    <div key={role} style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', marginBottom: '1rem', textTransform: 'capitalize' }}>
                        {role}s ({roleUsers.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {roleUsers.map((user: any) => {
                          const pref = notificationPreferences.find((p: any) => p.user_id === user.id && p.role === role) || {
                            user_id: user.id,
                            role: role,
                            whatsapp_enabled: true,
                            phone_number: user.phone || '',
                            notify_on_vehicle_created: role === 'installer' || role === 'manager',
                            notify_on_status_updated: false,
                            notify_on_installation_complete: role !== 'installer',
                            notify_on_invoice_added: role === 'manager',
                            notify_on_accountant_complete: role === 'coordinator',
                            notify_on_vehicle_delivered: role === 'manager',
                          }

                          return (
                            <div key={user.id} style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>{user.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    Phone: {pref.phone_number || 'Not set'}
                                  </div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={pref.whatsapp_enabled}
                                    onChange={(e) => {
                                      const updated = notificationPreferences.map((p: any) =>
                                        p.user_id === user.id && p.role === role
                                          ? { ...p, whatsapp_enabled: e.target.checked }
                                          : p
                                      )
                                      if (!updated.find((p: any) => p.user_id === user.id && p.role === role)) {
                                        updated.push({ ...pref, whatsapp_enabled: e.target.checked })
                                      }
                                      setNotificationPreferences(updated)
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Enabled</span>
                                </label>
                              </div>
                              {pref.whatsapp_enabled && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.75rem' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={pref.notify_on_vehicle_created}
                                      onChange={(e) => {
                                        const updated = notificationPreferences.map((p: any) =>
                                          p.user_id === user.id && p.role === role
                                            ? { ...p, notify_on_vehicle_created: e.target.checked }
                                            : p
                                        )
                                        if (!updated.find((p: any) => p.user_id === user.id && p.role === role)) {
                                          updated.push({ ...pref, notify_on_vehicle_created: e.target.checked })
                                        }
                                        setNotificationPreferences(updated)
                                      }}
                                    />
                                    <span>Vehicle Created</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={pref.notify_on_installation_complete}
                                      onChange={(e) => {
                                        const updated = notificationPreferences.map((p: any) =>
                                          p.user_id === user.id && p.role === role
                                            ? { ...p, notify_on_installation_complete: e.target.checked }
                                            : p
                                        )
                                        if (!updated.find((p: any) => p.user_id === user.id && p.role === role)) {
                                          updated.push({ ...pref, notify_on_installation_complete: e.target.checked })
                                        }
                                        setNotificationPreferences(updated)
                                      }}
                                    />
                                    <span>Installation Complete</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={pref.notify_on_invoice_added}
                                      onChange={(e) => {
                                        const updated = notificationPreferences.map((p: any) =>
                                          p.user_id === user.id && p.role === role
                                            ? { ...p, notify_on_invoice_added: e.target.checked }
                                            : p
                                        )
                                        if (!updated.find((p: any) => p.user_id === user.id && p.role === role)) {
                                          updated.push({ ...pref, notify_on_invoice_added: e.target.checked })
                                        }
                                        setNotificationPreferences(updated)
                                      }}
                                    />
                                    <span>Invoice Added</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={pref.notify_on_accountant_complete}
                                      onChange={(e) => {
                                        const updated = notificationPreferences.map((p: any) =>
                                          p.user_id === user.id && p.role === role
                                            ? { ...p, notify_on_accountant_complete: e.target.checked }
                                            : p
                                        )
                                        if (!updated.find((p: any) => p.user_id === user.id && p.role === role)) {
                                          updated.push({ ...pref, notify_on_accountant_complete: e.target.checked })
                                        }
                                        setNotificationPreferences(updated)
                                      }}
                                    />
                                    <span>Accountant Complete</span>
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={pref.notify_on_vehicle_delivered}
                                      onChange={(e) => {
                                        const updated = notificationPreferences.map((p: any) =>
                                          p.user_id === user.id && p.role === role
                                            ? { ...p, notify_on_vehicle_delivered: e.target.checked }
                                            : p
                                        )
                                        if (!updated.find((p: any) => p.user_id === user.id && p.role === role)) {
                                          updated.push({ ...pref, notify_on_vehicle_delivered: e.target.checked })
                                        }
                                        setNotificationPreferences(updated)
                                      }}
                                    />
                                    <span>Vehicle Delivered</span>
                                  </label>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                <button
                  onClick={saveNotificationPreferences}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save style={{ width: '1rem', height: '1rem' }} />
                  Save Preferences
                </button>
              </div>

              {/* Message Templates Editor */}
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', padding: '2rem', marginTop: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
                  Notification Message Templates
                </h3>

                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  Customize notification messages for each workflow event. Use variables like <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{'{{vehicleNumber}}'}</code>, <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{'{{customerName}}'}</code>, etc.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {[
                    { event_type: 'vehicle_inward_created', label: 'Vehicle Inward Created', description: 'Sent when coordinator creates a new vehicle entry' },
                    { event_type: 'installation_complete', label: 'Installation Complete', description: 'Sent when installer marks all products as complete' },
                    { event_type: 'invoice_number_added', label: 'Invoice Number Added', description: 'Sent when accountant adds an invoice number' },
                    { event_type: 'accountant_completed', label: 'Accountant Completed', description: 'Sent when accountant marks entry as complete' },
                    { event_type: 'vehicle_delivered', label: 'Vehicle Delivered', description: 'Sent when coordinator marks vehicle as delivered' },
                  ].map((templateInfo) => {
                    const currentTemplate = templateContent.get(templateInfo.event_type) || ''
                    const isEditing = editingTemplate === templateInfo.event_type

                    return (
                      <div key={templateInfo.event_type} style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                            {templateInfo.label}
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                            {templateInfo.description}
                          </p>
                        </div>
                        
                        {isEditing ? (
                          <div>
                            <textarea
                              value={templateContent.get(templateInfo.event_type) || ''}
                              onChange={(e) => {
                                const updated = new Map(templateContent)
                                updated.set(templateInfo.event_type, e.target.value)
                                setTemplateContent(updated)
                              }}
                              rows={8}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #2563eb',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontFamily: 'monospace',
                                outline: 'none',
                                resize: 'vertical'
                              }}
                              placeholder="Enter your message template here. Use {{variableName}} for dynamic values."
                            />
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                              <button
                                onClick={() => {
                                  setEditingTemplate(null)
                                  // Revert to original
                                  const updated = new Map(templateContent)
                                  const original = messageTemplates.find((t: any) => t.event_type === templateInfo.event_type)
                                  if (original) {
                                    updated.set(templateInfo.event_type, original.template)
                                  }
                                  setTemplateContent(updated)
                                }}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => setEditingTemplate(null)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Done Editing
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{
                              padding: '1rem',
                              backgroundColor: 'white',
                              borderRadius: '0.375rem',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.875rem',
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              color: '#374151',
                              minHeight: '120px',
                              marginBottom: '0.75rem'
                            }}>
                              {currentTemplate || 'No template set'}
                            </div>
                            <button
                              onClick={() => setEditingTemplate(templateInfo.event_type)}
                              style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: 'transparent',
                                color: '#2563eb',
                                border: '1px solid #2563eb',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <Edit style={{ width: '0.875rem', height: '0.875rem' }} />
                              Edit Template
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={saveMessageTemplates}
                  disabled={savingTemplates}
                  style={{
                    marginTop: '1.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: savingTemplates ? 'not-allowed' : 'pointer',
                    opacity: savingTemplates ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save style={{ width: '1rem', height: '1rem' }} />
                  {savingTemplates ? 'Saving Templates...' : 'Save All Templates'}
                </button>

                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>
                    Available Variables:
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0c4a6e', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.25rem' }}>
                    <code style={{ backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{'{{vehicleNumber}}'}</code>
                    <code style={{ backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{'{{customerName}}'}</code>
                    <code style={{ backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{'{{vehicleId}}'}</code>
                    <code style={{ backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{'{{status}}'}</code>
                    <code style={{ backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{'{{recipientName}}'}</code>
                    <code style={{ backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>{'{{recipientRole}}'}</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Tab - Only for Admins */}
          {activeTab === 'payment' && userRole === 'admin' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0', letterSpacing: '-0.025em' }}>
                  Payment & Subscription
                </h3>
                <p style={{ fontSize: '0.9375rem', color: '#6b7280', margin: 0, lineHeight: '1.6' }}>
                  Request account activation and submit payment proof to continue using the service
                </p>
              </div>

              {/* Account Status & Trial Information */}
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.75rem', 
                padding: '2rem', 
                border: '1px solid #e5e7eb', 
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
                      Account Status
                    </h4>
                    <div style={{ fontSize: '0.9375rem', color: '#374151' }}>
                      {subscriptionStatus === 'trial' && trialEndsAt && new Date(trialEndsAt) > new Date() ? (
                        <span style={{ 
                          color: '#f59e0b', 
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.375rem 0.875rem',
                          backgroundColor: '#fef3c7',
                          borderRadius: '0.5rem'
                        }}>⏱️ Trial Period Active</span>
                      ) : subscriptionStatus === 'active' && (subscription?.status === 'active' || paymentProofs.some(p => p.status === 'approved')) ? (
                        <span style={{ 
                          color: '#059669', 
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.375rem 0.875rem',
                          backgroundColor: '#dcfce7',
                          borderRadius: '0.5rem'
                        }}>
                          <CheckCircle style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem' }} />
                          Active
                        </span>
                      ) : (
                        <span style={{ 
                          color: '#dc2626', 
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.375rem 0.875rem',
                          backgroundColor: '#fef2f2',
                          borderRadius: '0.5rem'
                        }}>ΓÜá Inactive - Payment Required</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trial Period Countdown - Show prominently for trial accounts */}
                {subscriptionStatus === 'trial' && trialEndsAt && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #fcd34d',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 4px 6px rgba(251, 191, 36, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Clock style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
                      </div>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#92400e', margin: 0, letterSpacing: '-0.01em' }}>
                        {timeRemaining?.expired ? 'Trial Period Expired' : '24-Hour Trial Period'}
                      </h4>
                    </div>
                    {timeRemaining && !timeRemaining.expired && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '0.5rem', fontWeight: '500' }}>
                          Time Remaining:
                        </div>
                        <div style={{ 
                          fontSize: '2rem', 
                          fontWeight: '800', 
                          color: '#d97706',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                          letterSpacing: '0.05em',
                          lineHeight: '1.2'
                        }}>
                          {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}
                          {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#92400e', marginTop: '0.5rem', fontWeight: '500' }}>
                          Trial expires on: {trialEndsAt ? new Date(trialEndsAt).toLocaleString('en-IN', { 
                            dateStyle: 'long', 
                            timeStyle: 'short' 
                          }) : 'N/A'}
                        </div>
                      </div>
                    )}
                    {timeRemaining?.expired && (
                      <div style={{ 
                        fontSize: '0.9375rem', 
                        color: '#dc2626', 
                        fontWeight: '600',
                        padding: '0.875rem',
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #fecaca'
                      }}>
                        ⚠️ Your trial period has expired. Please submit payment proof to continue using the service.
                      </div>
                    )}
                    {!timeRemaining?.expired && (
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: '#78350f',
                        padding: '1rem',
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        marginTop: '1rem',
                        border: '1px solid #fde68a'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Next Steps:</strong>
                        <ul style={{ margin: '0', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
                          <li>Submit payment proof before trial expires to avoid service interruption</li>
                          <li>Payment amount: <strong>₹12,000 per year</strong> (₹1,000 per month)</li>
                          <li>Once payment is approved, your account will be active for 365 days</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {activationRequestStatus && (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    color: '#92400e'
                  }}>
                    Your activation request is pending review. Super admin will review and activate your account after payment verification.
                  </div>
                )}

                {/* Subscription Details - Show when payment is approved or subscription exists */}
                {(() => {
                  // Check if there's an approved payment proof
                  const hasApprovedProof = paymentProofs.some(p => p.status === 'approved')
                  const approvedProof = paymentProofs.find(p => p.status === 'approved')
                  
                  // Show if: (subscription exists and is active) OR (has approved payment proof)
                  const shouldShow = (subscription && subscription.status === 'active') || hasApprovedProof
                  
                  if (!shouldShow) return null
                  
                  // Use subscription data if available, otherwise calculate from approved payment proof
                  let subscriptionData = subscription
                  if (!subscriptionData && approvedProof) {
                    // Calculate subscription dates from approved payment proof
                    const paymentDate = approvedProof.payment_date 
                      ? new Date(approvedProof.payment_date)
                      : new Date(approvedProof.created_at)
                    const startDate = new Date(paymentDate)
                    startDate.setHours(0, 0, 0, 0)
                    const endDate = new Date(startDate)
                    endDate.setDate(endDate.getDate() + 365)
                    endDate.setHours(23, 59, 59, 999)
                    
                    subscriptionData = {
                      status: 'active',
                      amount: approvedProof.amount || 12000,
                      currency: approvedProof.currency || 'INR',
                      billing_period_start: startDate.toISOString(),
                      billing_period_end: endDate.toISOString()
                    }
                  }
                  
                  if (!subscriptionData) return null
                  
                  return (
                  <div style={{ marginTop: '1rem', padding: '1.25rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #86efac' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#166534' }}>
                        Payment Approved
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Subscription Plan</div>
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>Annual Plan</div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Amount</div>
                        <div style={{ fontWeight: '600', color: '#059669' }}>
                          {subscriptionData.currency === 'INR' ? '₹' : '$'}{subscriptionData.amount.toLocaleString('en-IN')}/year
                        </div>
                      </div>
                      {subscriptionData.billing_period_start && (
                        <div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Start Date</div>
                          <div style={{ fontWeight: '500', color: '#1f2937' }}>
                            {new Date(subscriptionData.billing_period_start).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      {subscriptionData.billing_period_end && (
                        <div>
                          <div style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Expiry Date</div>
                          <div style={{ fontWeight: '600', color: '#dc2626', fontSize: '1rem' }}>
                            {new Date(subscriptionData.billing_period_end).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    {subscriptionData.billing_period_end && daysRemaining !== null && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '0.375rem', border: '1px solid #86efac' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Days Remaining</div>
                        <div style={{ 
                          fontSize: '1.125rem', 
                          fontWeight: '700',
                          color: daysRemaining < 0 ? '#dc2626' : daysRemaining <= 30 ? '#f59e0b' : '#059669'
                        }}>
                          {daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days`}
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })()}
              </div>

              {/* Payment Guidance Section */}
              {subscriptionStatus === 'trial' && (
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  borderRadius: '0.75rem', 
                  padding: '2rem', 
                  border: '1px solid #bfdbfe', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <HelpCircle style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
                    </div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af', margin: 0, letterSpacing: '-0.01em' }}>
                      How to Submit Payment Proof
                    </h4>
                  </div>
                  <div style={{ fontSize: '0.9375rem', color: '#1e3a8a', lineHeight: '1.7' }}>
                    <p style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '1rem' }}>
                      To activate your account after the trial period, please follow these steps:
                    </p>
                    <ol style={{ marginLeft: '1.5rem', marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                      <li style={{ marginBottom: '0.75rem' }}>
                        <strong>Make Payment:</strong> Transfer ₹12,000 to the account details provided by support (contact support for payment information)
                      </li>
                      <li style={{ marginBottom: '0.75rem' }}>
                        <strong>Collect Proof:</strong> Take a screenshot or download your bank transaction receipt/statement showing the payment
                      </li>
                      <li style={{ marginBottom: '0.75rem' }}>
                        <strong>Submit Below:</strong> Upload the payment proof (image or PDF), enter your transaction ID, and submit
                      </li>
                      <li style={{ marginBottom: '0.75rem' }}>
                        <strong>Wait for Approval:</strong> Super admin will review your payment proof within 24-48 hours
                      </li>
                      <li>
                        <strong>Account Activated:</strong> Once approved, your account will be active for 365 days from the payment date
                      </li>
                    </ol>
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'white', 
                      borderRadius: '0.5rem',
                      border: '1px solid #bfdbfe',
                      marginTop: '1rem',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>≡ƒÆí Need Payment Details?</strong>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e3a8a', lineHeight: '1.6' }}>
                        Contact our support team using the "Subscription Support" section below to get bank account details and payment instructions.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Proof Form */}
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.75rem', 
                padding: '2rem', 
                border: '1px solid #e5e7eb', 
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                    Submit Payment Proof
                  </h4>
                  <p style={{ fontSize: '0.9375rem', color: '#6b7280', margin: 0, lineHeight: '1.6' }}>
                    Upload your payment receipt or bank statement to activate your account. Accepted formats: JPG, PNG, PDF (Max 10MB)
                  </p>
                </div>
                <form onSubmit={handlePaymentProofSubmit}>
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '0.75rem'
                      }}>
                        Payment Proof (Image/PDF) <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div style={{
                        position: 'relative',
                        border: '2px dashed #d1d5db',
                        borderRadius: '0.5rem',
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: '#f9fafb',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2563eb'
                        e.currentTarget.style.backgroundColor = '#eff6ff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db'
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }}
                      onClick={() => document.getElementById('payment-proof-file')?.click()}
                      >
                        <input
                          id="payment-proof-file"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setPaymentForm({ ...paymentForm, file: e.target.files?.[0] || null })}
                          required
                          style={{ display: 'none' }}
                        />
                        <FileText style={{ width: '2.5rem', height: '2.5rem', color: '#6b7280', margin: '0 auto 0.75rem' }} />
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                          {paymentForm.file ? paymentForm.file.name : 'Click to upload or drag and drop'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          JPG, PNG, PDF (Max 10MB)
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '0.75rem'
                      }}>
                        Transaction ID / Reference Number <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentForm.transactionId}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                        placeholder="Enter transaction ID or reference number"
                        required
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.9375rem',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#2563eb'
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '0.75rem'
                      }}>
                        Payment Date <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                        required
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.9375rem',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#2563eb'
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '0.75rem'
                      }}>
                        Notes (Optional)
                      </label>
                      <textarea
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        placeholder="Any additional information..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.9375rem',
                          resize: 'vertical',
                          transition: 'all 0.2s',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#2563eb'
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)'
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={uploadingProof || !paymentForm.file}
                      style={{
                        padding: '0.875rem 1.75rem',
                        backgroundColor: (uploadingProof || !paymentForm.file) ? '#9ca3af' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.9375rem',
                        fontWeight: '600',
                        cursor: (uploadingProof || !paymentForm.file) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        boxShadow: (uploadingProof || !paymentForm.file) ? 'none' : '0 2px 4px rgba(5, 150, 105, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        if (!uploadingProof && paymentForm.file) {
                          e.currentTarget.style.backgroundColor = '#047857'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(5, 150, 105, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!uploadingProof && paymentForm.file) {
                          e.currentTarget.style.backgroundColor = '#059669'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.2)'
                        }
                      }}
                    >
                      <Save style={{ width: '1.125rem', height: '1.125rem' }} />
                      {uploadingProof ? 'Submitting...' : 'Submit Payment Proof'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Payment Proof History */}
              {paymentProofs.length > 0 && (
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.75rem', 
                  padding: '2rem', 
                  border: '1px solid #e5e7eb', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
                    Payment Proof History
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {paymentProofs.map((proof) => (
                      <div
                        key={proof.id}
                        style={{
                          padding: '1.25rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#f9fafb',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6'
                          e.currentTarget.style.borderColor = '#d1d5db'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb'
                          e.currentTarget.style.borderColor = '#e5e7eb'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#111827', marginBottom: '0.375rem' }}>
                            Transaction: <span style={{ fontFamily: 'monospace', color: '#374151' }}>{proof.transaction_id || 'N/A'}</span>
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                            Submitted: {new Date(proof.created_at).toLocaleString('en-IN', { 
                              dateStyle: 'medium', 
                              timeStyle: 'short' 
                            })}
                          </div>
                        </div>
                        <div>
                          <span style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.8125rem',
                            fontWeight: '600',
                            backgroundColor: proof.status === 'approved' ? '#dcfce7' : proof.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                            color: proof.status === 'approved' ? '#166534' : proof.status === 'rejected' ? '#dc2626' : '#92400e',
                            border: `1px solid ${proof.status === 'approved' ? '#86efac' : proof.status === 'rejected' ? '#fecaca' : '#fde68a'}`
                          }}>
                            {proof.status === 'approved' ? (
                              <>
                                <CheckCircle style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                Approved
                              </>
                            ) : proof.status === 'rejected' ? (
                              <>
                                <XCircle style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                Rejected
                              </>
                            ) : (
                              <>
                                <Clock style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                                Pending
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Support Section */}
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '0.75rem', 
                padding: '2rem', 
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <HelpCircle style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
                  </div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '-0.01em' }}>
                    Subscription Support
                  </h4>
                </div>
                <p style={{ fontSize: '0.9375rem', color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Need help with your subscription or payment? Contact our support team:
                </p>
                {loadingSupport ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9375rem' }}>Loading support contacts...</div>
                ) : supportEmails.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {supportEmails.map((email, index) => (
                      <a
                        key={index}
                        href={`mailto:${email}?subject=Subscription Support Request&body=Hello,%0D%0A%0D%0AI need assistance with my subscription.%0D%0A%0D%0AThank you.`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '1rem 1.25rem',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '0.5rem',
                          textDecoration: 'none',
                          color: '#1e40af',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dbeafe'
                          e.currentTarget.style.borderColor = '#93c5fd'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#eff6ff'
                          e.currentTarget.style.borderColor = '#bfdbfe'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <Mail style={{ width: '1.125rem', height: '1.125rem' }} />
                        <span>{email}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '1.25rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    color: '#92400e',
                    fontWeight: '500'
                  }}>
                    Support contacts are not available. Please contact your system administrator.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other tabs - placeholder */}
          {activeTab !== 'management' && activeTab !== 'profile' && activeTab !== 'company' && activeTab !== 'notifications' && activeTab !== 'payment' && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings coming soon...
            </div>
          )}
          </div>
        </div>
      </div>

      {/* User Management Modal */}
      {showUserModal && (
        <UserManagementModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false)
            setEditingItem(null)
          }}
          editingUser={editingItem}
          role={modalRole}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  )
}
