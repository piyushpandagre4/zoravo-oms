/**
 * Invoices API Route
 * GET: List invoices with filters
 * POST: Create new invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'

export async function GET(request: NextRequest) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant context
    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as any
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const filters: any = {}
    if (status) filters.status = status
    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate
    if (search) filters.search = search

    // Use direct query for server-side
    // Query invoices without nested relationships to avoid FK relationship errors
    // We'll enrich the data separately if needed
    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items (*)
      `)
      .order('created_at', { ascending: false })

    // Apply tenant filter
    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    // Apply filters
    // Only filter by status if provided and not 'all'
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('invoice_date', startDate)
    }

    if (endDate) {
      query = query.lte('invoice_date', endDate)
    }

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    const { data: invoices, error } = await query

    if (error) {
      // If invoices table doesn't exist or has schema issues, return empty array with helpful message
      if (error.message?.includes('relation') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('column') ||
          error.code === 'PGRST116') {
        console.warn('[Invoices API] Table/view may not exist yet. Run database migrations:', error.message)
        const finalResponse = NextResponse.json({ 
          invoices: [],
          message: 'Invoices table not found. Please run database migrations first.'
        })
        response.cookies.getAll().forEach(cookie => {
          finalResponse.cookies.set(cookie.name, cookie.value)
        })
        return finalResponse
      }
      console.error('[Invoices API] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich invoices with vehicle_inward and vehicle data if relationship exists
    // Do this separately to avoid FK relationship errors
    // For now, skip enrichment to avoid relationship errors - can be added later if needed
    // The frontend can fetch vehicle data separately if needed
    const finalResponse = NextResponse.json({ invoices: invoices || [] })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant context
    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    if (!tenantId && !isSuper) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      vehicleInwardId,
      invoiceDate,
      dueDate,
      discountAmount,
      discountReason,
      taxAmount,
      notes,
      lineItems,
      issueImmediately
    } = body

    if (!vehicleInwardId || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'vehicleInwardId and lineItems are required' },
        { status: 400 }
      )
    }

    // Validate lineItems have valid prices
    const invalidItems = lineItems.filter((item: any) => {
      const unitPrice = parseFloat(item.unit_price || item.price || 0)
      return isNaN(unitPrice) || unitPrice < 0
    })
    
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: `Invalid prices found in ${invalidItems.length} line item(s). Please ensure all products have valid prices.` },
        { status: 400 }
      )
    }

    // Create invoice directly using Supabase (server-side)
    // Fetch vehicle_inward data
    let inwardQuery = supabase
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
      .eq('id', vehicleInwardId)
      .single()

    if (!isSuper && tenantId) {
      inwardQuery = inwardQuery.eq('tenant_id', tenantId)
    }

    const { data: vehicleInward, error: inwardError } = await inwardQuery

    if (inwardError || !vehicleInward) {
      return NextResponse.json({ error: 'Vehicle inward not found' }, { status: 404 })
    }

    // Calculate totals - ensure all values are valid numbers
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      const lineTotal = item.line_total || ((item.unit_price || item.price || 0) * (item.quantity || 1))
      const parsed = parseFloat(lineTotal) || 0
      return sum + parsed
    }, 0)
    const discount = parseFloat(discountAmount) || 0
    const tax = parseFloat(taxAmount) || 0
    const amount = Math.max(0, subtotal - discount)  // amount is subtotal after discount (before tax), ensure non-negative
    const totalAmount = Math.max(0, amount + tax)     // total_amount is amount + tax, ensure non-negative

    // Generate invoice number if issuing immediately
    let invoiceNumber: string | null = null
    if (issueImmediately) {
      // Get tenant code
      let tenantCode = ''
      if (tenantId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('tenant_code')
          .eq('id', tenantId)
          .single()
        tenantCode = tenant?.tenant_code || ''
      }
      const prefix = tenantCode ? `${tenantCode}-` : 'INV-'
      
      // Get next number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)
        .single()

      let nextNum = 1
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/\d+$/)
        if (match) {
          nextNum = parseInt(match[0]) + 1
        }
      }
      invoiceNumber = `${prefix}${String(nextNum).padStart(6, '0')}`
    }

    // Set dates
    const invDate = invoiceDate || new Date().toISOString().split('T')[0]
    const due = dueDate || (() => {
      const date = new Date(invDate)
      date.setDate(date.getDate() + 30)
      return date.toISOString().split('T')[0]
    })()

    // Get customer name from vehicle relationship
    const customerName = vehicleInward.vehicles?.customers?.name || 
                         vehicleInward.customer_name || 
                         'Unknown Customer'

    // Validate that amount is a valid number (required field)
    if (isNaN(amount) || amount === null || amount === undefined) {
      return NextResponse.json(
        { error: 'Invalid amount calculation. Please check line items have valid prices.' },
        { status: 400 }
      )
    }

    // Create invoice
    const invoiceData: any = {
      tenant_id: tenantId,
      vehicle_inward_id: vehicleInwardId,
      vehicle_id: vehicleInward.vehicles?.id,
      customer_name: customerName,
      invoice_number: invoiceNumber,
      invoice_date: invDate,
      due_date: due,
      status: issueImmediately ? 'issued' : 'draft',
      amount: parseFloat(amount.toFixed(2)),                    // Subtotal after discount (before tax) - required field
      total_amount: parseFloat(totalAmount.toFixed(2)),        // Final total (amount + tax)
      paid_amount: 0,
      balance_amount: parseFloat(totalAmount.toFixed(2)),
      discount_amount: parseFloat(discount.toFixed(2)),
      discount_reason: discountReason,
      tax_amount: parseFloat(tax.toFixed(2)),
      notes: notes,
      issued_at: issueImmediately ? new Date().toISOString() : null
    }

    let invoiceQuery = supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()

    const { data: invoice, error: invoiceError } = await invoiceQuery

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: invoiceError?.message || 'Failed to create invoice' }, { status: 400 })
    }

    // Create line items - ensure all required fields are valid numbers
    let lineItemsData
    try {
      lineItemsData = lineItems.map((item: any) => {
        const unitPrice = parseFloat(item.unit_price || item.price || 0)
        const quantity = parseFloat(item.quantity || 1)
        const lineTotal = parseFloat(item.line_total || (unitPrice * quantity))
        
        // Validate unit_price is a valid number (required field)
        if (isNaN(unitPrice) || unitPrice === null || unitPrice === undefined || unitPrice < 0) {
          throw new Error(`Invalid unit_price for product: ${item.product_name || item.product || 'Unknown'}. Price must be a valid number.`)
        }
        
        return {
          invoice_id: invoice.id,
          tenant_id: tenantId,
          product_name: item.product_name || item.product || 'Unknown Product',
          brand: item.brand || null,
          department: item.department || null,
          quantity: quantity,
          unit_price: parseFloat(unitPrice.toFixed(2)),
          line_total: parseFloat(lineTotal.toFixed(2))
        }
      })
    } catch (mappingError: any) {
      // Rollback invoice creation
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return NextResponse.json({ error: mappingError.message || 'Failed to process line items' }, { status: 400 })
    }

    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsData)

    if (lineItemsError) {
      // Rollback invoice creation
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return NextResponse.json({ error: lineItemsError.message }, { status: 400 })
    }

    const finalResponse = NextResponse.json({ invoice }, { status: 201 })
    // Copy cookies from response
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
