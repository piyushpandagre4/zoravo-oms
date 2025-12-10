import { createClient } from '@/lib/supabase/client'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  created_at: string
  updated_at: string
}

export interface Vehicle {
  id: string
  customer_id: string
  registration_number: string
  make: string
  model: string
  year: number
  color?: string
  engine_number?: string
  chassis_number?: string
  vehicle_type?: string
  last_service_date?: string
  next_service_date?: string
  warranty_expiry?: string
  insurance_expiry?: string
  total_services: number
  status: string
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface WorkOrder {
  id: string
  vehicle_id: string
  order_number: string
  type: string
  description?: string
  status: string
  assigned_to?: string
  start_date?: string
  end_date?: string
  estimated_cost?: number
  actual_cost?: number
  created_at: string
  updated_at: string
  vehicle?: Vehicle
}

export interface Invoice {
  id: string
  vehicle_id: string
  work_order_id?: string
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  status: string
  due_date?: string
  paid_date?: string
  payment_method?: string
  description?: string
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  work_order?: WorkOrder
  // Optional fields used when we preview invoice-like rows from vehicle_inward
  previewFromInward?: any
  previewProducts?: Array<{ product: string; brand?: string; price: number; department?: string }>
}

export interface ServiceTracker {
  id: string
  vehicle_id: string
  work_order_id: string
  checkpoint_name: string
  status: string
  completed_at?: string
  notes?: string
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  work_order?: WorkOrder
}

export interface FollowUp {
  id: string
  vehicle_id: string
  customer_id: string
  subject: string
  next_call_date: string
  outcome?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  customer?: Customer
}

export interface Requirement {
  id: string
  customer_id: string
  vehicle_id: string
  requirement: string
  priority: string
  status: string
  estimated_cost?: number
  notes?: string
  created_at: string
  updated_at: string
  customer?: Customer
  vehicle?: Vehicle
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  payment_method: string
  payment_date: string
  reference_number?: string
  notes?: string
  created_at: string
}

export interface DashboardKPIs {
  vehiclesInWorkshop: number
  jobsInProgress: number
  todaysIntakes: number
  unpaidInvoices: number
  overduePayments: number
  monthlyRevenue: number
  vehiclesInWorkshopChange: number
  jobsInProgressChange: number
  todaysIntakesChange: number
  unpaidInvoicesChange: number
  overduePaymentsChange: number
  monthlyRevenueChange: number
}

class DatabaseService {
  private supabase = createClient()

  // Helper method to add tenant filter to queries
  private addTenantFilter(query: any, tenantId: string | null, isSuper: boolean = false) {
    if (isSuper || !tenantId) {
      return query
    }
    return query.eq('tenant_id', tenantId)
  }

  // Get current tenant ID
  private getTenantId(): string | null {
    return getCurrentTenantId()
  }

  // Check if super admin
  private checkIsSuperAdmin(): boolean {
    return isSuperAdmin()
  }

  // Dashboard KPIs
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().substring(0, 7)
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 7)

      // Get vehicles in workshop
      let vehiclesQuery = this.supabase
        .from('vehicles')
        .select('id')
        .eq('status', 'in_workshop')
      vehiclesQuery = this.addTenantFilter(vehiclesQuery, tenantId, isSuper)
      const { data: vehiclesInWorkshop } = await vehiclesQuery

      // Get jobs in progress
      let jobsQuery = this.supabase
        .from('work_orders')
        .select('id')
        .eq('status', 'in_progress')
      jobsQuery = this.addTenantFilter(jobsQuery, tenantId, isSuper)
      const { data: jobsInProgress } = await jobsQuery

      // Get today's intakes
      let intakesQuery = this.supabase
        .from('vehicles')
        .select('id')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
      intakesQuery = this.addTenantFilter(intakesQuery, tenantId, isSuper)
      const { data: todaysIntakes } = await intakesQuery

      // Get unpaid invoices
      let unpaidQuery = this.supabase
        .from('invoices')
        .select('id')
        .eq('status', 'pending')
      unpaidQuery = this.addTenantFilter(unpaidQuery, tenantId, isSuper)
      const { data: unpaidInvoices } = await unpaidQuery

      // Get overdue payments
      let overdueQuery = this.supabase
        .from('invoices')
        .select('id')
        .eq('status', 'overdue')
      overdueQuery = this.addTenantFilter(overdueQuery, tenantId, isSuper)
      const { data: overduePayments } = await overdueQuery

      // Get monthly revenue
      let revenueQuery = this.supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('paid_date', `${thisMonth}-01`)
        .lte('paid_date', `${thisMonth}-31`)
      revenueQuery = this.addTenantFilter(revenueQuery, tenantId, isSuper)
      const { data: monthlyRevenue } = await revenueQuery

      // Calculate changes (simplified - in real app, you'd compare with previous periods)
      const vehiclesInWorkshopChange = 2
      const jobsInProgressChange = 1
      const todaysIntakesChange = 3
      const unpaidInvoicesChange = -1
      const overduePaymentsChange = 0
      const monthlyRevenueChange = 15

      const totalRevenue = monthlyRevenue?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0

      return {
        vehiclesInWorkshop: vehiclesInWorkshop?.length || 0,
        jobsInProgress: jobsInProgress?.length || 0,
        todaysIntakes: todaysIntakes?.length || 0,
        unpaidInvoices: unpaidInvoices?.length || 0,
        overduePayments: overduePayments?.length || 0,
        monthlyRevenue: totalRevenue,
        vehiclesInWorkshopChange,
        jobsInProgressChange,
        todaysIntakesChange,
        unpaidInvoicesChange,
        overduePaymentsChange,
        monthlyRevenueChange
      }
    } catch (error) {
      console.error('Error fetching dashboard KPIs:', error)
      throw error
    }
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('vehicles')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      throw error
    }
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('vehicles')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', id)
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query.single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching vehicle:', error)
      throw error
    }
  }

  async createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const tenantId = this.getTenantId()
      
      // Ensure tenant_id is set when creating
      const vehicleWithTenant = {
        ...vehicle,
        tenant_id: tenantId || vehicle.tenant_id
      }
      
      const { data, error } = await this.supabase
        .from('vehicles')
        .insert(vehicleWithTenant)
        .select(`
          *,
          customer:customers(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating vehicle:', error)
      throw error
    }
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query.select(`
          *,
          customer:customers(*)
        `).single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating vehicle:', error)
      throw error
    }
  }

  // Work Orders
  async getWorkOrders(): Promise<WorkOrder[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .order('created_at', { ascending: false })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching work orders:', error)
      throw error
    }
  }

  async getWorkOrdersByVehicle(vehicleId: string): Promise<WorkOrder[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('work_orders')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching work orders by vehicle:', error)
      throw error
    }
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      // First, get invoices without joins
      let invoicesQuery = this.supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
      
      invoicesQuery = this.addTenantFilter(invoicesQuery, tenantId, isSuper)
      const { data: invoices, error: invoicesError } = await invoicesQuery

      if (invoicesError) throw invoicesError

      // Fetch vehicles separately
      if (!invoices || invoices.length === 0) return []

      const vehicleIds = invoices.map(inv => inv.vehicle_id).filter(Boolean)
      
      if (vehicleIds.length > 0) {
        let vehiclesQuery = this.supabase
          .from('vehicles')
          .select('*, customer:customers(*)')
          .in('id', vehicleIds)
        
        vehiclesQuery = this.addTenantFilter(vehiclesQuery, tenantId, isSuper)
        const { data: vehicles } = await vehiclesQuery

        // Map vehicles to invoices
        const vehiclesMap = new Map(vehicles?.map(v => [v.id, v]) || [])
        invoices.forEach(invoice => {
          if (vehiclesMap.has(invoice.vehicle_id)) {
            invoice.vehicle = vehiclesMap.get(invoice.vehicle_id)
          }
        })
      }

      return invoices || []
    } catch (error) {
      console.error('Error fetching invoices:', error)
      throw error
    }
  }

  async getInvoicesByVehicle(vehicleId: string): Promise<Invoice[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      // Get invoices and fetch vehicle separately
      let invoicesQuery = this.supabase
        .from('invoices')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
      
      invoicesQuery = this.addTenantFilter(invoicesQuery, tenantId, isSuper)
      const { data: invoices, error: invoicesError } = await invoicesQuery

      if (invoicesError) throw invoicesError

      if (!invoices || invoices.length === 0) return []

      // Fetch vehicle details
      let vehicleQuery = this.supabase
        .from('vehicles')
        .select('*, customer:customers(*)')
        .eq('id', vehicleId)
      
      vehicleQuery = this.addTenantFilter(vehicleQuery, tenantId, isSuper)
      const { data: vehicle } = await vehicleQuery.single()

      // Map vehicle to invoices
      if (vehicle) {
        invoices.forEach(invoice => {
          invoice.vehicle = vehicle
        })
      }

      return invoices || []
    } catch (error) {
      console.error('Error fetching invoices by vehicle:', error)
      throw error
    }
  }

  // Service Trackers
  async getServiceTrackers(): Promise<ServiceTracker[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('service_trackers')
        .select(`
          *,
          vehicle:vehicles(*),
          work_order:work_orders(*)
        `)
        .order('created_at', { ascending: false })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching service trackers:', error)
      throw error
    }
  }

  // Follow-ups
  async getFollowUps(): Promise<FollowUp[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('follow_ups')
        .select(`
          *,
          vehicle:vehicles(*),
          customer:customers(*)
        `)
        .order('next_call_date', { ascending: true })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching follow-ups:', error)
      throw error
    }
  }

  // Requirements
  async getRequirements(): Promise<Requirement[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('requirements')
        .select(`
          *,
          customer:customers(*),
          vehicle:vehicles(*)
        `)
        .order('created_at', { ascending: false })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching requirements:', error)
      throw error
    }
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      let query = this.supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      
      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching customers:', error)
      throw error
    }
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    try {
      const tenantId = this.getTenantId()
      
      // Ensure tenant_id is set when creating
      const customerWithTenant = {
        ...customer,
        tenant_id: tenantId || customer.tenant_id
      }
      
      const { data, error } = await this.supabase
        .from('customers')
        .insert(customerWithTenant)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating customer:', error)
      throw error
    }
  }

  // Recent data for dashboard
  async getRecentVehicles(limit: number = 5): Promise<any[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      // First try to get from vehicle_inward (more complete data)
      let inwardQuery = this.supabase
        .from('vehicle_inward')
        .select('*')
        .order('created_at', { ascending: false })
        // Use a high limit to fetch all vehicles, filtering will be done in the component
        .limit(limit > 100 ? limit : 1000) // If limit is high, use it; otherwise use 1000 as max
      
      inwardQuery = this.addTenantFilter(inwardQuery, tenantId, isSuper)
      const { data: inwardData, error: inwardError } = await inwardQuery

      if (!inwardError && inwardData && inwardData.length > 0) {
        // Don't filter here - let the component handle filtering based on status
        // This allows showing all vehicles from "Pending" to "Completed"
        const filteredData = inwardData

        // Transform to include customer and vehicle info from the flat structure
        // Return all filtered data, not limited by the original limit parameter
        return filteredData.map((inward: any) => ({
          id: inward.id,
          registration_number: inward.registration_number,
          make: inward.make || 'Unknown',
          model: inward.model,
          year: inward.year,
          color: inward.color,
          vehicle_type: inward.vehicle_type,
          customer: {
            name: inward.customer_name,
            phone: inward.customer_phone,
            email: inward.customer_email,
            address: inward.customer_address
          },
          status: inward.status || 'pending',
          issues_reported: inward.issues_reported,
          accessories_requested: inward.accessories_requested,
          estimated_cost: inward.estimated_cost,
          assigned_manager_id: inward.assigned_manager_id,
          assigned_installer_id: inward.assigned_installer_id,
          location_id: inward.location_id,
          estimated_completion_date: inward.estimated_completion_date,
          notes: inward.notes, // Include notes for product completion tracking
          created_at: inward.created_at,
          updated_at: inward.updated_at
        }))
      }

      // Fallback to vehicles table if vehicle_inward doesn't exist or has no data
      let vehiclesQuery = this.supabase
        .from('vehicles')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      vehiclesQuery = this.addTenantFilter(vehiclesQuery, tenantId, isSuper)
      const { data, error } = await vehiclesQuery

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching recent vehicles:', error)
      throw error
    }
  }

  async getRecentInvoices(limit: number = 5): Promise<Invoice[]> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()
      
      // 1) Fetch real invoices
      let invoicesQuery = this.supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      invoicesQuery = this.addTenantFilter(invoicesQuery, tenantId, isSuper)
      const { data: invoices, error: invoicesError } = await invoicesQuery

      if (invoicesError) throw invoicesError

      const realInvoices: Invoice[] = invoices || []

      // 2) Fetch ALL recent vehicle_inward entries to show in Recent Invoices tab (with prices)
      // This allows accountant to see all entries immediately after Vehicle Inward Form is filled
      let inwardQuery = this.supabase
        .from('vehicle_inward')
        .select('*')
        .order('created_at', { ascending: false })
        // Use a high limit to fetch all vehicles, filtering will be done in the component
        .limit(limit > 100 ? limit : 1000) // If limit is high, use it; otherwise use 1000 as max
      
      inwardQuery = this.addTenantFilter(inwardQuery, tenantId, isSuper)
      const { data: allInwardEntriesRaw } = await inwardQuery

      // Filter out only final/delivered statuses - include all entries from pending to completed
      // Similar to vehicles: show all from pending to completed, exclude only delivered
      // Note: "completed" status should be included (not filtered out)
      const finalStatuses = ['delivered', 'complete_and_delivered', 'delivered_final', 'delivered (final)']
      const allInwardEntries = (allInwardEntriesRaw || []).filter((entry: any) => {
        const status = (entry.status || '').toLowerCase().trim()
        return !finalStatuses.some(finalStatus => status === finalStatus.toLowerCase().trim())
      })

      // Map all inward entries into lightweight invoice-like rows with product prices
      const previewInvoices: Invoice[] = (allInwardEntries || []).map((v: any) => {
        // Compute total based on accessories_requested JSON
        let totalAmount = 0
        let parsedProducts: Array<{ product: string; brand?: string; price: number; department?: string }> = []
        try {
          const parsed = v.accessories_requested ? JSON.parse(v.accessories_requested) : []
          if (Array.isArray(parsed)) {
            parsedProducts = parsed.map((p: any) => ({
              product: p?.product || '',
              brand: p?.brand,
              price: parseFloat(p?.price || 0),
              department: p?.department,
            }))
            totalAmount = parsedProducts.reduce((sum: number, p) => sum + (p.price || 0), 0)
          }
        } catch {
          // leave as 0 if parsing fails
        }

        // Construct a minimal vehicle object for display in dashboard table
        const pseudoVehicle: any = {
          id: v.vehicle_id || v.id,
          registration_number: v.registration_number,
          customer: {
            name: v.customer_name,
          },
        }

        // Get status description based on current status
        const statusDescriptions: Record<string, string> = {
          'pending': 'Pending - awaiting invoice',
          'in_progress': 'In Progress - awaiting invoice',
          'under_installation': 'Under Installation - awaiting invoice',
          'installation_complete': 'Installation complete - awaiting invoice',
        }
        const statusDesc = statusDescriptions[v.status] || `${v.status} - awaiting invoice`

        // Get invoice number from notes if available, otherwise use short_id or registration_number
        let invoiceNumber = v.short_id || (v.registration_number ?? 'PENDING')
        if (v.notes) {
          try {
            const notesData = JSON.parse(v.notes)
            if (notesData.invoice_number) {
              invoiceNumber = notesData.invoice_number
            }
          } catch {
            // If parsing fails, use default
          }
        }

        const pseudo: Invoice = {
          id: `vi_${v.id}`,
          vehicle_id: v.vehicle_id || v.id,
          work_order_id: undefined,
          invoice_number: invoiceNumber,
          amount: totalAmount,
          tax_amount: 0,
          total_amount: totalAmount,
          status: v.status || 'pending', // Use actual status from vehicle_inward
          due_date: undefined,
          paid_date: undefined,
          payment_method: undefined,
          description: statusDesc,
          created_at: v.created_at, // Use created_at so newest entries appear first
          updated_at: v.updated_at || v.created_at,
          vehicle: pseudoVehicle,
          previewFromInward: v,
          previewProducts: parsedProducts,
          work_order: undefined,
        }

        return pseudo
      })

      // 3) Enrich real invoices with vehicle data
      if (realInvoices.length > 0) {
        const vehicleIds = realInvoices.map(inv => inv.vehicle_id).filter(Boolean)
        if (vehicleIds.length > 0) {
          let vehiclesQuery = this.supabase
            .from('vehicles')
            .select('*, customer:customers(*)')
            .in('id', vehicleIds)
          
          vehiclesQuery = this.addTenantFilter(vehiclesQuery, tenantId, isSuper)
          const { data: vehicles } = await vehiclesQuery

          const vehiclesMap = new Map(vehicles?.map(v => [v.id, v]) || [])
          realInvoices.forEach(invoice => {
            if (vehiclesMap.has(invoice.vehicle_id)) {
              invoice.vehicle = vehiclesMap.get(invoice.vehicle_id)
            }
          })
        }
      }

      // 4) Merge previews + real invoices, sort by created/updated date, and return all
      // Return all merged invoices, not limited by the original limit parameter
      const merged = [...previewInvoices, ...realInvoices]
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return merged // Return all, not limited
    } catch (error) {
      console.error('Error fetching recent invoices:', error)
      throw error
    }
  }
}

export const dbService = new DatabaseService()

