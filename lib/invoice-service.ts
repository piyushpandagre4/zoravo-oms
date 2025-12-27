/**
 * Invoice Service
 * Handles invoice lifecycle management: draft, issued, partial, paid, overdue, cancelled
 */

import { createClient } from '@/lib/supabase/client'
import { getCurrentTenantId, isSuperAdmin } from '@/lib/tenant-context'

export interface InvoiceLineItem {
  product_name: string
  brand?: string
  department?: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface CreateInvoiceOptions {
  vehicleInwardId: string
  invoiceDate?: string
  dueDate?: string
  discountAmount?: number
  discountReason?: string
  taxAmount?: number
  notes?: string
  lineItems: InvoiceLineItem[]
  issueImmediately?: boolean
}

export interface PaymentData {
  amount: number
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other'
  payment_date: string
  reference_number?: string
  paid_by?: string
  notes?: string
}

export interface InvoiceFilters {
  status?: 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  startDate?: string
  endDate?: string
  customerId?: string
  vehicleId?: string
  search?: string
}

class InvoiceService {
  private supabase = createClient()

  private getTenantId(): string | null {
    return getCurrentTenantId()
  }

  private checkIsSuperAdmin(): boolean {
    return isSuperAdmin()
  }

  private addTenantFilter(query: any, tenantId: string | null, isSuper: boolean = false) {
    if (isSuper || !tenantId) {
      return query
    }
    return query.eq('tenant_id', tenantId)
  }

  /**
   * Create invoice from completed job (vehicle_inward)
   */
  async createInvoiceFromJob(options: CreateInvoiceOptions): Promise<{ invoice: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      if (!tenantId && !isSuper) {
        return { invoice: null, error: { message: 'Tenant ID required' } }
      }

      // Fetch vehicle_inward data
      let inwardQuery = this.supabase
        .from('vehicle_inward')
        .select(`
          *,
          vehicles (
            id,
            customer_id,
            registration_number,
            make,
            model,
            customers (
              id,
              name,
              phone,
              email
            )
          )
        `)
        .eq('id', options.vehicleInwardId)
        .single()

      inwardQuery = this.addTenantFilter(inwardQuery, tenantId, isSuper)
      const { data: vehicleInward, error: inwardError } = await inwardQuery

      if (inwardError || !vehicleInward) {
        return { invoice: null, error: inwardError || { message: 'Vehicle inward not found' } }
      }

      // Calculate totals
      const subtotal = options.lineItems.reduce((sum, item) => sum + item.line_total, 0)
      const discount = options.discountAmount || 0
      const tax = options.taxAmount || 0
      const totalAmount = subtotal - discount + tax

      // Generate invoice number if issuing immediately
      let invoiceNumber: string | null = null
      if (options.issueImmediately) {
        const { data: generatedNumber } = await this.supabase.rpc('generate_invoice_number', {
          tenant_uuid: tenantId
        })
        invoiceNumber = generatedNumber || `INV-${Date.now()}`
      }

      // Set dates
      const invoiceDate = options.invoiceDate || new Date().toISOString().split('T')[0]
      const dueDate = options.dueDate || (() => {
        const date = new Date(invoiceDate)
        date.setDate(date.getDate() + 30)
        return date.toISOString().split('T')[0]
      })()

      // Create invoice
      const invoiceData: any = {
        tenant_id: tenantId,
        vehicle_inward_id: options.vehicleInwardId,
        vehicle_id: vehicleInward.vehicles?.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate,
        status: options.issueImmediately ? 'issued' : 'draft',
        total_amount: totalAmount,
        paid_amount: 0,
        balance_amount: totalAmount,
        discount_amount: discount,
        discount_reason: options.discountReason,
        tax_amount: tax,
        notes: options.notes,
        issued_at: options.issueImmediately ? new Date().toISOString() : null
      }

      let invoiceQuery = this.supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single()

      invoiceQuery = this.addTenantFilter(invoiceQuery, tenantId, isSuper)
      const { data: invoice, error: invoiceError } = await invoiceQuery

      if (invoiceError || !invoice) {
        return { invoice: null, error: invoiceError }
      }

      // Create line items
      const lineItemsData = options.lineItems.map(item => ({
        invoice_id: invoice.id,
        tenant_id: tenantId,
        product_name: item.product_name,
        brand: item.brand,
        department: item.department,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      }))

      let lineItemsQuery = this.supabase
        .from('invoice_line_items')
        .insert(lineItemsData)
        .select()

      lineItemsQuery = this.addTenantFilter(lineItemsQuery, tenantId, isSuper)
      const { error: lineItemsError } = await lineItemsQuery

      if (lineItemsError) {
        // Rollback invoice creation
        await this.supabase.from('invoices').delete().eq('id', invoice.id)
        return { invoice: null, error: lineItemsError }
      }

      return { invoice, error: null }
    } catch (error: any) {
      return { invoice: null, error: { message: error.message } }
    }
  }

  /**
   * Create draft invoice from vehicle_inward with products from accessories_requested
   */
  async createDraftInvoice(vehicleInwardId: string, products?: InvoiceLineItem[]): Promise<{ invoice: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      // Fetch vehicle_inward with products
      let inwardQuery = this.supabase
        .from('vehicle_inward')
        .select('*, vehicles(*)')
        .eq('id', vehicleInwardId)
        .single()

      inwardQuery = this.addTenantFilter(inwardQuery, tenantId, isSuper)
      const { data: vehicleInward, error: inwardError } = await inwardQuery

      if (inwardError || !vehicleInward) {
        return { invoice: null, error: inwardError || { message: 'Vehicle inward not found' } }
      }

      // Parse products from accessories_requested if not provided
      let lineItems: InvoiceLineItem[] = products || []
      if (!products && vehicleInward.accessories_requested) {
        try {
          const parsed = JSON.parse(vehicleInward.accessories_requested)
          if (Array.isArray(parsed)) {
            lineItems = parsed.map((p: any) => ({
              product_name: p.product || '',
              brand: p.brand,
              department: p.department,
              quantity: 1,
              unit_price: parseFloat(p.price || 0),
              line_total: parseFloat(p.price || 0)
            }))
          }
        } catch (e) {
          // Invalid JSON, use empty array
        }
      }

      if (lineItems.length === 0) {
        return { invoice: null, error: { message: 'No products found' } }
      }

      // Create draft invoice
      const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)
      const invoiceDate = new Date().toISOString().split('T')[0]
      const dueDate = (() => {
        const date = new Date(invoiceDate)
        date.setDate(date.getDate() + 30)
        return date.toISOString().split('T')[0]
      })()

      return await this.createInvoiceFromJob({
        vehicleInwardId,
        invoiceDate,
        dueDate,
        lineItems,
        issueImmediately: false
      })
    } catch (error: any) {
      return { invoice: null, error: { message: error.message } }
    }
  }

  /**
   * Issue invoice (move from draft to issued)
   */
  async issueInvoice(invoiceId: string): Promise<{ invoice: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      // Get current invoice
      let invoiceQuery = this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      invoiceQuery = this.addTenantFilter(invoiceQuery, tenantId, isSuper)
      const { data: invoice, error: fetchError } = await invoiceQuery

      if (fetchError || !invoice) {
        return { invoice: null, error: fetchError || { message: 'Invoice not found' } }
      }

      if (invoice.status !== 'draft') {
        return { invoice: null, error: { message: 'Only draft invoices can be issued' } }
      }

      // Generate invoice number if not set
      let invoiceNumber = invoice.invoice_number
      if (!invoiceNumber) {
        const { data: generatedNumber } = await this.supabase.rpc('generate_invoice_number', {
          tenant_uuid: tenantId
        })
        invoiceNumber = generatedNumber || `INV-${Date.now()}`
      }

      // Update invoice
      const updateData: any = {
        status: 'issued',
        invoice_number: invoiceNumber,
        issued_at: new Date().toISOString(),
        invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0]
      }

      let updateQuery = this.supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single()

      updateQuery = this.addTenantFilter(updateQuery, tenantId, isSuper)
      const { data: updatedInvoice, error: updateError } = await updateQuery

      if (updateError || !updatedInvoice) {
        return { invoice: null, error: updateError }
      }

      return { invoice: updatedInvoice, error: null }
    } catch (error: any) {
      return { invoice: null, error: { message: error.message } }
    }
  }

  /**
   * Record payment for an invoice
   */
  async recordPayment(invoiceId: string, paymentData: PaymentData): Promise<{ payment: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      const userId = user?.id

      // Verify invoice exists
      let invoiceQuery = this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      invoiceQuery = this.addTenantFilter(invoiceQuery, tenantId, isSuper)
      const { data: invoice, error: invoiceError } = await invoiceQuery

      if (invoiceError || !invoice) {
        return { payment: null, error: invoiceError || { message: 'Invoice not found' } }
      }

      if (invoice.status === 'cancelled') {
        return { payment: null, error: { message: 'Cannot record payment for cancelled invoice' } }
      }

      // Create payment record
      // Map payment_mode to payment_method if the table uses payment_method
      const paymentRecord: any = {
        invoice_id: invoiceId,
        tenant_id: tenantId,
        amount: paymentData.amount,
        payment_method: paymentData.payment_mode,  // Use payment_method for database column
        payment_mode: paymentData.payment_mode,    // Also include payment_mode if both columns exist
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number,
        paid_by: paymentData.paid_by,
        notes: paymentData.notes,
        created_by: userId
      }

      // Insert payment record (without .single() first to avoid coercion errors)
      let paymentQuery = this.supabase
        .from('payments')
        .insert(paymentRecord)
        .select()

      paymentQuery = this.addTenantFilter(paymentQuery, tenantId, isSuper)
      const { data: paymentData, error: paymentError } = await paymentQuery

      if (paymentError) {
        return { payment: null, error: paymentError }
      }

      if (!paymentData || paymentData.length === 0) {
        return { payment: null, error: { message: 'Payment was not created' } }
      }

      const payment = paymentData[0]  // Get first payment record

      // Trigger will automatically update invoice status and amounts
      // But let's also manually refresh to get updated invoice
      const { data: updatedInvoice } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      return { payment, error: null }
    } catch (error: any) {
      return { payment: null, error: { message: error.message } }
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string, reason: string): Promise<{ invoice: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      // Get current invoice
      let invoiceQuery = this.supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      invoiceQuery = this.addTenantFilter(invoiceQuery, tenantId, isSuper)
      const { data: invoice, error: fetchError } = await invoiceQuery

      if (fetchError || !invoice) {
        return { invoice: null, error: fetchError || { message: 'Invoice not found' } }
      }

      if (invoice.status === 'paid') {
        return { invoice: null, error: { message: 'Cannot cancel paid invoice' } }
      }

      // Update invoice
      const updateData: any = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason
      }

      let updateQuery = this.supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single()

      updateQuery = this.addTenantFilter(updateQuery, tenantId, isSuper)
      const { data: updatedInvoice, error: updateError } = await updateQuery

      if (updateError || !updatedInvoice) {
        return { invoice: null, error: updateError }
      }

      return { invoice: updatedInvoice, error: null }
    } catch (error: any) {
      return { invoice: null, error: { message: error.message } }
    }
  }

  /**
   * Get invoices by status with filters
   */
  async getInvoicesByStatus(filters: InvoiceFilters = {}): Promise<{ invoices: any[]; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      let query = this.supabase
        .from('invoices')
        .select(`
          *,
          vehicle_inward (
            id,
            vehicles (
              id,
              registration_number,
              make,
              model,
              customers (
                id,
                name,
                phone,
                email
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.startDate) {
        query = query.gte('invoice_date', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('invoice_date', filters.endDate)
      }

      if (filters.search) {
        query = query.or(`invoice_number.ilike.%${filters.search}%,vehicle_inward.vehicles.registration_number.ilike.%${filters.search}%,vehicle_inward.vehicles.customers.name.ilike.%${filters.search}%`)
      }

      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data: invoices, error } = await query

      if (error) {
        return { invoices: [], error }
      }

      return { invoices: invoices || [], error: null }
    } catch (error: any) {
      return { invoices: [], error: { message: error.message } }
    }
  }

  /**
   * Get invoice summary (financial metrics)
   */
  async getInvoiceSummary(): Promise<{ summary: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      // Get summary from view
      let query = this.supabase
        .from('v_invoice_summary')
        .select('*')

      if (!isSuper && tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: summaryData, error: summaryError } = await query

      if (summaryError) {
        return { summary: null, error: summaryError }
      }

      // Calculate totals
      const totalInvoiced = summaryData?.reduce((sum: number, s: any) => 
        sum + (s.status === 'issued' || s.status === 'partial' || s.status === 'paid' ? s.total_invoiced : 0), 0) || 0

      const totalReceived = summaryData?.reduce((sum: number, s: any) => sum + s.total_received, 0) || 0

      const totalOutstanding = summaryData?.reduce((sum: number, s: any) => 
        sum + (s.status === 'issued' || s.status === 'partial' || s.status === 'overdue' ? s.total_outstanding : 0), 0) || 0

      const totalOverdue = summaryData?.find((s: any) => s.status === 'overdue')?.total_outstanding || 0

      return {
        summary: {
          totalInvoiced,
          totalReceived,
          totalOutstanding,
          totalOverdue,
          byStatus: summaryData || []
        },
        error: null
      }
    } catch (error: any) {
      return { summary: null, error: { message: error.message } }
    }
  }

  /**
   * Mark overdue invoices (for cron job)
   */
  async markOverdueInvoices(): Promise<{ count: number; error: any }> {
    try {
      const { data, error } = await this.supabase.rpc('mark_overdue_invoices')

      if (error) {
        return { count: 0, error }
      }

      return { count: data || 0, error: null }
    } catch (error: any) {
      return { count: 0, error: { message: error.message } }
    }
  }

  /**
   * Get single invoice with full details
   */
  async getInvoiceById(invoiceId: string): Promise<{ invoice: any; error: any }> {
    try {
      const tenantId = this.getTenantId()
      const isSuper = this.checkIsSuperAdmin()

      let query = this.supabase
        .from('invoices')
        .select(`
          *,
          invoice_line_items (*),
          payments (*),
          vehicle_inward (
            id,
            vehicles (
              id,
              registration_number,
              make,
              model,
              customers (
                id,
                name,
                phone,
                email
              )
            )
          )
        `)
        .eq('id', invoiceId)
        .single()

      query = this.addTenantFilter(query, tenantId, isSuper)
      const { data: invoice, error } = await query

      if (error) {
        return { invoice: null, error }
      }

      return { invoice, error: null }
    } catch (error: any) {
      return { invoice: null, error: { message: error.message } }
    }
  }
}

export const invoiceService = new InvoiceService()
