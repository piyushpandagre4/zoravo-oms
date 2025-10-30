'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Shield, Bell, Database, Save, Users, Wrench, MapPin, UserCheck, Edit, Trash2, Plus, X, DollarSign, Briefcase, Car } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import UserManagementModal from '@/components/UserManagementModal'

export default function SettingsPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [managementTab, setManagementTab] = useState('installers')
  const [isLoading, setIsLoading] = useState(false)
  
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
  const [departmentForm, setDepartmentForm] = useState({ name: '', status: 'active' })
  
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
    businessHours: 'Open ⋅ Closes 7 pm',
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
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
  ]
  const filteredTabs = (userRole === 'installer' || userRole === 'coordinator' || userRole === 'manager' || userRole === 'accountant') ? tabs.filter(t => t.id === 'company') : tabs

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
  }, [])

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        
        // Fetch profile data
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (!error && profile) {
          setUserRole(profile.role)
          if (profile.role === 'installer' || profile.role === 'coordinator' || profile.role === 'manager' || profile.role === 'accountant') {
            setActiveTab('company')
          }
          setProfileSettings(prev => ({
            ...prev,
            name: profile.name || prev.name,
            email: profile.email || user.email || prev.email
          }))
        } else {
          // Use auth user data if profile not found
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

  // Fetch functions
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['coordinator', 'installer', 'accountant', 'manager'])
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchInstallers = async () => {
    try {
      // Fetch installers from profiles table (where they're actually stored)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'installer')
        .order('created_at', { ascending: false })
      if (error) throw error
      setInstallersList(data || [])
    } catch (error) {
      console.error('Error fetching installers:', error)
    }
  }

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'manager')
        .order('created_at', { ascending: false })
      if (error) throw error
      setManagers(data || [])
    } catch (error) {
      console.error('Error fetching managers:', error)
    }
  }

  const fetchAccountants = async () => {
    try {
      // Fetch accountants only from profiles table (do NOT include coordinators)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'accountant')
        .order('created_at', { ascending: false })
      if (error) throw error
      setAccountantsList(data || [])
    } catch (error) {
      console.error('Error fetching accountants:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from('locations').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchVehicleTypes = async () => {
    try {
      const { data, error } = await supabase.from('vehicle_types').select('*').order('name', { ascending: true })
      if (error) throw error
      setVehicleTypes(data || [])
    } catch (error) {
      console.error('Error fetching vehicle types:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true })
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

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_group', ['profile', 'company'])
      
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
          businessHours: 'Open ⋅ Closes 7 pm',
          openingTime: '09:00',
          closingTime: '19:00',
          gstNumber: '',
          panNumber: '',
          registrationNumber: ''
        })
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
      const settings = [
        { setting_key: 'company_name', setting_value: companySettings.name, setting_group: 'company' },
        { setting_key: 'company_address', setting_value: companySettings.address, setting_group: 'company' },
        { setting_key: 'company_phone', setting_value: companySettings.phone, setting_group: 'company' },
        { setting_key: 'company_email', setting_value: companySettings.email || '', setting_group: 'company' },
        { setting_key: 'company_website', setting_value: companySettings.website || '', setting_group: 'company' },
        { setting_key: 'company_business_hours', setting_value: companySettings.businessHours || '', setting_group: 'company' },
        { setting_key: 'company_opening_time', setting_value: companySettings.openingTime || '', setting_group: 'company' },
        { setting_key: 'company_closing_time', setting_value: companySettings.closingTime || '', setting_group: 'company' },
        { setting_key: 'company_gst_number', setting_value: companySettings.gstNumber || '', setting_group: 'company' },
        { setting_key: 'company_pan_number', setting_value: companySettings.panNumber || '', setting_group: 'company' },
        { setting_key: 'company_registration_number', setting_value: companySettings.registrationNumber || '', setting_group: 'company' }
      ]

      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'setting_key' })
        
        if (error) throw error
      }

      alert('Company settings saved successfully! Changes will be reflected across the application.')
      
      // Trigger events to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('company-settings-updated'))
        localStorage.setItem('companyName', companySettings.name)
      }
      
      // Refresh after a short delay to show changes
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
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
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
      
      const { error } = await supabase.from(table).update({ status: newStatus }).eq('id', id)
      if (error) throw error

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
      if (editingVehicleType) {
        // Update existing
        const { error } = await supabase
          .from('vehicle_types')
          .update({ name: vehicleTypeForm.name, status: vehicleTypeForm.status })
          .eq('id', editingVehicleType.id)
        
        if (error) throw error
        alert('Vehicle type updated successfully!')
      } else {
        // Create new
        const { error } = await supabase
          .from('vehicle_types')
          .insert([{ name: vehicleTypeForm.name, status: vehicleTypeForm.status }])
        
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
      if (editingDepartment) {
        // Update existing
        const { error } = await supabase
          .from('departments')
          .update({ name: departmentForm.name, status: departmentForm.status })
          .eq('id', editingDepartment.id)
        
        if (error) throw error
        alert('Department updated successfully!')
      } else {
        // Create new
        const { error } = await supabase
          .from('departments')
          .insert([{ name: departmentForm.name, status: departmentForm.status }])
        
        if (error) throw error
        alert('Department created successfully!')
      }
      
      await fetchDepartments()
      setShowDepartmentForm(false)
      setEditingDepartment(null)
      setDepartmentForm({ name: '', status: 'active' })
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
      if (editingLocation) {
        // Update existing
        const { error } = await supabase
          .from('locations')
          .update({ 
            name: locationForm.name, 
            address: locationForm.address,
            status: locationForm.status 
          })
          .eq('id', editingLocation.id)
        
        if (error) throw error
        alert('Location updated successfully!')
      } else {
        // Create new
        const { error } = await supabase
          .from('locations')
          .insert([{ 
            name: locationForm.name, 
            address: locationForm.address,
            status: locationForm.status 
          }])
        
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
    <div style={{ padding: '2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Settings</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Manage your account and system settings</p>
      </div>

      {/* Tabs */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                  padding: '0.5rem 1rem',
                border: 'none',
                  backgroundColor: activeTab === tab.id ? '#eff6ff' : 'transparent',
                color: activeTab === tab.id ? '#2563eb' : '#64748b',
                  borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <tab.icon style={{ width: '1rem', height: '1rem' }} />
              {tab.label}
            </button>
          ))}
      </div>

          {/* Management Sub-tabs */}
          {activeTab === 'management' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['installers', 'managers', 'accountants', 'coordinator', 'locations', 'vehicle_types', 'departments'].map((tab) => (
                  <button
                  key={tab}
                  onClick={() => setManagementTab(tab)}
                    style={{
                      padding: '0.5rem 1rem',
                    backgroundColor: managementTab === tab ? '#2563eb' : 'white',
                    color: managementTab === tab ? 'white' : '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                                    cursor: 'pointer'
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
                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
          )}

          {/* Departments Management */}
          {activeTab === 'management' && managementTab === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: 0 }}>Departments Management</h3>
                <button
                  onClick={() => {
                    setEditingDepartment(null)
                    setDepartmentForm({ name: '', status: 'active' })
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
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowDepartmentForm(false)
                        setEditingDepartment(null)
                        setDepartmentForm({ name: '', status: 'active' })
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
              
              <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Name</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Created</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
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
                                  setDepartmentForm({
                                    name: department.name || '',
                                    status: department.status || 'active'
                                  })
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
                      <Shield style={{ width: '1rem', height: '1rem', color: '#d97706' }} />
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
                          ✓ Passwords match
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
                      <Shield style={{ width: '1rem', height: '1rem' }} />
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
                      placeholder="info@company.com"
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
                      placeholder="e.g., Open ⋅ Closes 7 pm"
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

          {/* Other tabs - placeholder */}
          {activeTab !== 'management' && activeTab !== 'profile' && activeTab !== 'company' && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings coming soon...
            </div>
          )}
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
    </div>
  )
}
