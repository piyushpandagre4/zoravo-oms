'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Globe, Shield, DollarSign, Clock, Plus, Trash2, Edit, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SubscriptionPlan {
  id?: string
  plan_name: string
  plan_display_name: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'annual' | 'quarterly'
  trial_days: number
  is_active: boolean
  features?: string[]
  max_users?: number
  max_storage_gb?: number
}

interface PlatformSettings {
  platformName: string
  supportEmail: string
  defaultTrialDays: number
  defaultCurrency: string
  subscriptionPlans: SubscriptionPlan[]
}

export default function PlatformSettingsPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'ZORAVO OMS',
    supportEmail: 'support@zoravo.com',
    defaultTrialDays: 24,
    defaultCurrency: 'INR',
    subscriptionPlans: [
      {
        plan_name: 'annual',
        plan_display_name: 'Annual Plan',
        amount: 12000,
        currency: 'INR',
        billing_cycle: 'annual',
        trial_days: 24,
        is_active: true,
        features: ['Unlimited users', 'Priority support', 'All features'],
        max_users: -1,
        max_storage_gb: -1
      }
    ]
  })
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<number | null>(null)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
    plan_name: '',
    plan_display_name: '',
    amount: 0,
    currency: 'INR',
    billing_cycle: 'monthly',
    trial_days: 24,
    is_active: true,
    features: [] as string[],
    max_users: 10,
    max_storage_gb: 5
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load platform settings (tenant_id IS NULL for global platform settings)
      const { data: platformSettings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'platform_name',
          'support_email',
          'default_trial_days',
          'default_currency',
          'subscription_plans'
        ])
        .is('tenant_id', null) // Platform settings are global

      if (platformSettings) {
        const settingsMap: any = {}
        platformSettings.forEach(s => {
          settingsMap[s.setting_key] = s.setting_value
        })

        // Load subscription plans from database - ensure only one plan
        let loadedPlans: SubscriptionPlan[] = []
        if (settingsMap.subscription_plans) {
          try {
            const parsedPlans = JSON.parse(settingsMap.subscription_plans)
            // Validate that loaded plans have required fields
            const validPlans = Array.isArray(parsedPlans) 
              ? parsedPlans.filter((plan: any) => plan.plan_name && plan.plan_display_name && plan.amount)
              : []
            
            // Ensure we have exactly one plan (annual plan)
            if (validPlans.length > 0) {
              // Keep only the annual plan if it exists, otherwise use the first one
              const annualPlan = validPlans.find((p: any) => p.plan_name === 'annual' && p.billing_cycle === 'annual')
              loadedPlans = annualPlan ? [annualPlan] : [validPlans[0]]
            } else {
              // Initialize with default annual plan
              loadedPlans = [{
                plan_name: 'annual',
                plan_display_name: 'Annual Plan',
                amount: 12000,
                currency: 'INR',
                billing_cycle: 'annual',
                trial_days: 24,
                is_active: true,
                features: ['Unlimited users', 'Priority support', 'All features'],
                max_users: -1,
                max_storage_gb: -1
              }]
            }
          } catch (e) {
            console.error('Error parsing subscription plans:', e)
            // Initialize with default annual plan on error
            loadedPlans = [{
              plan_name: 'annual',
              plan_display_name: 'Annual Plan',
              amount: 12000,
              currency: 'INR',
              billing_cycle: 'annual',
              trial_days: 24,
              is_active: true,
              features: ['Unlimited users', 'Priority support', 'All features'],
              max_users: -1,
              max_storage_gb: -1
            }]
          }
        } else {
          // Initialize with default annual plan if no plans exist
          loadedPlans = [{
            plan_name: 'annual',
            plan_display_name: 'Annual Plan',
            amount: 12000,
            currency: 'INR',
            billing_cycle: 'annual',
            trial_days: 24,
            is_active: true,
            features: ['Unlimited users', 'Priority support', 'All features'],
            max_users: -1,
            max_storage_gb: -1
          }]
        }

        setSettings(prev => ({
          ...prev,
          platformName: settingsMap.platform_name || prev.platformName,
          supportEmail: settingsMap.support_email || prev.supportEmail,
          defaultTrialDays: parseInt(settingsMap.default_trial_days) || prev.defaultTrialDays,
          defaultCurrency: settingsMap.default_currency || prev.defaultCurrency,
          subscriptionPlans: loadedPlans.length > 0 ? loadedPlans : prev.subscriptionPlans // Use loaded plans or keep defaults
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const settingsToSave = [
        { setting_key: 'platform_name', setting_value: settings.platformName, setting_group: 'platform' },
        { setting_key: 'support_email', setting_value: settings.supportEmail, setting_group: 'platform' },
        { setting_key: 'default_trial_days', setting_value: settings.defaultTrialDays.toString(), setting_group: 'subscription' },
        { setting_key: 'default_currency', setting_value: settings.defaultCurrency, setting_group: 'subscription' }
      ]

      // Save platform settings - check if exists first, then update or insert
      for (const setting of settingsToSave) {
        // Check if setting exists (platform settings have tenant_id = NULL)
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', setting.setting_key)
          .is('tenant_id', null) // Platform settings are global
          .maybeSingle()

        if (existing) {
          // Update existing setting
          const { error } = await supabase
            .from('system_settings')
            .update({
              setting_value: setting.setting_value,
              setting_group: setting.setting_group,
              updated_at: new Date().toISOString()
            })
            .eq('setting_key', setting.setting_key)
            .is('tenant_id', null)
          
          if (error) {
            console.error(`Error updating ${setting.setting_key}:`, error)
            throw error
          }
        } else {
          // Insert new setting (with tenant_id = NULL for platform settings)
          const { error } = await supabase
            .from('system_settings')
            .insert({
              setting_key: setting.setting_key,
              setting_value: setting.setting_value,
              setting_group: setting.setting_group,
              tenant_id: null, // Platform settings are global
              updated_at: new Date().toISOString()
            })
          
          if (error) {
            console.error(`Error inserting ${setting.setting_key}:`, error)
            throw error
          }
        }
      }

      // Save subscription plans - ensure only one plan (annual plan)
      // Always ensure we have exactly one annual plan
      const plansToSave = settings.subscriptionPlans.length > 0 
        ? [settings.subscriptionPlans[0]] // Only save the first plan
        : [{
            plan_name: 'annual',
            plan_display_name: 'Annual Plan',
            amount: 12000,
            currency: 'INR',
            billing_cycle: 'annual',
            trial_days: 24,
            is_active: true,
            features: ['Unlimited users', 'Priority support', 'All features'],
            max_users: -1,
            max_storage_gb: -1
          }]

      // Save subscription plans - check if exists first, then update or insert
      const { data: existingPlans } = await supabase
        .from('system_settings')
        .select('id')
        .eq('setting_key', 'subscription_plans')
        .is('tenant_id', null) // Platform settings are global
        .maybeSingle()

      if (existingPlans) {
        // Update existing plans
        const { error: plansError } = await supabase
          .from('system_settings')
          .update({
            setting_value: JSON.stringify(plansToSave),
            setting_group: 'subscription',
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'subscription_plans')
          .is('tenant_id', null)

        if (plansError) {
          console.error('Error updating subscription plans:', plansError)
          throw plansError
        }
      } else {
        // Insert new plans (with tenant_id = NULL for platform settings)
        const { error: plansError } = await supabase
          .from('system_settings')
          .insert({
            setting_key: 'subscription_plans',
            setting_value: JSON.stringify(plansToSave),
            setting_group: 'subscription',
            tenant_id: null, // Platform settings are global
            updated_at: new Date().toISOString()
          })

        if (plansError) {
          console.error('Error inserting subscription plans:', plansError)
          throw plansError
        }
      }

      alert('Settings saved successfully!')
      // Reload settings to ensure consistency
      await loadSettings()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddPlan = () => {
    // Prevent adding more plans - only one annual plan allowed
    alert('Only one annual plan (₹12,000/year) is allowed. You can edit the existing plan.')
  }

  const handleUpdatePlan = (index: number) => {
    setEditingPlan(null)
  }

  const handleDeletePlan = (index: number) => {
    // Prevent deletion - only one plan allowed
    alert('Cannot delete the plan. Only one annual plan is allowed.')
  }

  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`
    }
    return `$${amount.toLocaleString('en-US')}`
  }

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return '/month'
      case 'annual': return '/year'
      case 'quarterly': return '/quarter'
      default: return ''
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0 0 0.5rem 0'
        }}>
          Platform Settings
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Configure platform-wide settings and defaults
        </p>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '2rem'
      }}>
        {/* General Settings */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Globe style={{ width: '1.25rem', height: '1.25rem' }} />
            General Settings
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Platform Name
              </label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        </div>

        {/* Subscription Settings */}
        <div style={{ marginBottom: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Shield style={{ width: '1.25rem', height: '1.25rem' }} />
            Subscription Settings
          </h2>
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#92400e',
              fontWeight: '500'
            }}>
              💡 Remember to click "Save Settings" after making changes
            </div>
          </div>

          {/* Default Trial Settings */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            marginBottom: '2rem',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock style={{ width: '1rem', height: '1rem' }} />
              Default Trial Configuration
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                  Trial Period (Days) *
              </label>
              <input
                type="number"
                value={settings.defaultTrialDays}
                  onChange={(e) => setSettings({ ...settings, defaultTrialDays: parseInt(e.target.value) || 0 })}
                  min="1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Trial automatically starts when account is created
                </p>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                  Default Currency *
              </label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Subscription Plans Management */}
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <DollarSign style={{ width: '1rem', height: '1rem' }} />
                Subscription Plan
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                Single annual plan: ₹12,000 per year
              </p>
            </div>

            {/* Add New Plan Form - Removed: Only single annual plan allowed */}
            {false && showAddPlan && (
              <div style={{
                backgroundColor: '#f0f9ff',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>Add New Subscription Plan</h4>
                  <button
                    onClick={() => setShowAddPlan(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280'
                    }}
                  >
                    <X style={{ width: '1rem', height: '1rem' }} />
                  </button>
                </div>

                {/* Basic Plan Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Basic Information</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Plan Name (ID) *</label>
                      <input
                        type="text"
                        value={newPlan.plan_name}
                        onChange={(e) => setNewPlan({ ...newPlan, plan_name: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                        placeholder="e.g., monthly, annual"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                      <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>Unique identifier (lowercase, no spaces)</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Display Name *</label>
                      <input
                        type="text"
                        value={newPlan.plan_display_name}
                        onChange={(e) => setNewPlan({ ...newPlan, plan_display_name: e.target.value })}
                        placeholder="e.g., Monthly Plan"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Billing Cycle *</label>
                      <select
                        value={newPlan.billing_cycle}
                        onChange={(e) => setNewPlan({ ...newPlan, billing_cycle: e.target.value as any })}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: 'white' }}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Trial Days *</label>
                      <input
                        type="number"
                        value={newPlan.trial_days}
                        onChange={(e) => setNewPlan({ ...newPlan, trial_days: parseInt(e.target.value) || 0 })}
                        min="0"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Pricing</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Amount *</label>
                      <input
                        type="number"
                        value={newPlan.amount}
                        onChange={(e) => setNewPlan({ ...newPlan, amount: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Currency *</label>
                      <select
                        value={newPlan.currency}
                        onChange={(e) => setNewPlan({ ...newPlan, currency: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: 'white' }}
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Resource Limits */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Resource Limits</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Max Users *</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={newPlan.max_users === -1 ? '' : newPlan.max_users}
                          onChange={(e) => {
                            const val = e.target.value
                            setNewPlan({ ...newPlan, max_users: val === '' ? -1 : parseInt(val) || 0 })
                          }}
                          disabled={newPlan.max_users === -1}
                          min="1"
                          placeholder="Enter number"
                          style={{ 
                            flex: 1, 
                            padding: '0.5rem', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '0.375rem', 
                            fontSize: '0.875rem',
                            backgroundColor: newPlan.max_users === -1 ? '#f3f4f6' : 'white'
                          }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={newPlan.max_users === -1}
                            onChange={(e) => setNewPlan({ ...newPlan, max_users: e.target.checked ? -1 : 10 })}
                            style={{ width: '0.875rem', height: '0.875rem' }}
                          />
                          <span>Unlimited</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Max Storage (GB) *</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={newPlan.max_storage_gb === -1 ? '' : newPlan.max_storage_gb}
                          onChange={(e) => {
                            const val = e.target.value
                            setNewPlan({ ...newPlan, max_storage_gb: val === '' ? -1 : parseInt(val) || 0 })
                          }}
                          disabled={newPlan.max_storage_gb === -1}
                          min="1"
                          placeholder="Enter GB"
                          style={{ 
                            flex: 1, 
                            padding: '0.5rem', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '0.375rem', 
                            fontSize: '0.875rem',
                            backgroundColor: newPlan.max_storage_gb === -1 ? '#f3f4f6' : 'white'
                          }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={newPlan.max_storage_gb === -1}
                            onChange={(e) => setNewPlan({ ...newPlan, max_storage_gb: e.target.checked ? -1 : 5 })}
                            style={{ width: '0.875rem', height: '0.875rem' }}
                          />
                          <span>Unlimited</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h5 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Plan Features</h5>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        id="feature-input"
                        placeholder="Add a feature (e.g., Priority support)"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const input = e.currentTarget
                            const feature = input.value.trim()
                            if (feature && !(newPlan.features || []).includes(feature)) {
                              setNewPlan({ ...newPlan, features: [...(newPlan.features || []), feature] })
                              input.value = ''
                            }
                          }
                        }}
                        style={{ 
                          flex: 1, 
                          padding: '0.5rem', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '0.375rem', 
                          fontSize: '0.875rem' 
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('feature-input') as HTMLInputElement
                          const feature = input?.value.trim()
                          if (feature && !(newPlan.features || []).includes(feature)) {
                            setNewPlan({ ...newPlan, features: [...(newPlan.features || []), feature] })
                            input.value = ''
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {(() => {
                      const features = newPlan.features
                      return features && Array.isArray(features) && features.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {features.map((feature, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#eff6ff',
                              color: '#1e40af',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            {feature}
                            <button
                              type="button"
                              onClick={() => {
                                const currentFeatures = newPlan.features && Array.isArray(newPlan.features) ? newPlan.features : []
                                setNewPlan({ 
                                  ...newPlan, 
                                  features: currentFeatures.filter((_, i) => i !== idx)
                                })
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#1e40af',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <X style={{ width: '0.75rem', height: '0.75rem' }} />
                            </button>
                          </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Plan Status */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newPlan.is_active}
                      onChange={(e) => setNewPlan({ ...newPlan, is_active: e.target.checked })}
                      style={{ width: '1rem', height: '1rem' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                      Plan is Active (visible to users)
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPlan(false)
                      setNewPlan({
                        plan_name: '',
                        plan_display_name: '',
                        amount: 0,
                        currency: 'INR',
                        billing_cycle: 'monthly',
                        trial_days: 24,
                        is_active: true,
                        features: [],
                        max_users: 10,
                        max_storage_gb: 5
                      })
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPlan}
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
                    <Plus style={{ width: '0.875rem', height: '0.875rem' }} />
                    Add Plan
                  </button>
                </div>
              </div>
            )}

            {/* Plans List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {settings.subscriptionPlans.map((plan, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    backgroundColor: plan.is_active ? 'white' : '#f9fafb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                          {plan.plan_display_name}
                        </h4>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: plan.is_active ? '#dcfce7' : '#f3f4f6',
                          color: plan.is_active ? '#166534' : '#6b7280'
                        }}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Price</div>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937' }}>
                            {formatPrice(plan.amount, plan.currency)}{getBillingCycleLabel(plan.billing_cycle)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Billing Cycle</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', textTransform: 'capitalize' }}>
                            {plan.billing_cycle}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Trial Period</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                            {plan.trial_days} days
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Max Users</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                            {plan.max_users === -1 ? 'Unlimited' : plan.max_users}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Storage</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                            {plan.max_storage_gb === -1 ? 'Unlimited' : `${plan.max_storage_gb} GB`}
                          </div>
                        </div>
                      </div>
                      {plan.features && plan.features.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>Features</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {plan.features.map((feature, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#eff6ff',
                                  color: '#1e40af',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setEditingPlan(editingPlan === index ? null : index)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          color: '#374151'
                        }}
                      >
                        <Edit style={{ width: '1rem', height: '1rem' }} />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(index)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#fef2f2',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                      >
                        <Trash2 style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: saving ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Save style={{ width: '1rem', height: '1rem' }} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
