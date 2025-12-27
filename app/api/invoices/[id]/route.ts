/**
 * Single Invoice API Route
 * GET: Get invoice by ID
 * PATCH: Update invoice
 * DELETE: Cancel invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientForRouteHandler } from '@/lib/supabase/server'
import { invoiceService } from '@/lib/invoice-service'
import { checkIsSuperAdmin, getTenantIdForUser } from '@/lib/tenant-context'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    // Get invoice directly (without nested relationships to avoid schema cache issues)
    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items (*),
        payments (*)
      `)
      .eq('id', params.id)
      .single()

    if (!isSuper && tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data: invoice, error } = await query

    if (error || !invoice) {
      return NextResponse.json({ error: error?.message || 'Invoice not found' }, { status: 404 })
    }

    // Enrich invoice with vehicle_inward data separately if needed
    // This avoids the relationship cache issue
    if (invoice.vehicle_inward_id) {
      try {
        // First, get vehicle_inward basic data
        let vehicleInwardQuery = supabase
          .from('vehicle_inward')
          .select(`
            id,
            short_id,
            registration_number,
            customer_name,
            customer_phone,
            customer_email,
            vehicle_id
          `)
          .eq('id', invoice.vehicle_inward_id)
          .single()

        if (!isSuper && tenantId) {
          vehicleInwardQuery = vehicleInwardQuery.eq('tenant_id', tenantId)
        }

        const { data: vehicleInward } = await vehicleInwardQuery
        
        if (vehicleInward) {
          // Try to get vehicle data if vehicle_id exists
          if (vehicleInward.vehicle_id) {
            try {
              let vehicleQuery = supabase
                .from('vehicles')
                .select(`
                  id,
                  registration_number,
                  make,
                  model,
                  year,
                  color,
                  customer_id
                `)
                .eq('id', vehicleInward.vehicle_id)
                .single()

              if (!isSuper && tenantId) {
                // Get tenant_id from vehicle if available
                vehicleQuery = vehicleQuery.eq('tenant_id', tenantId)
              }

              const { data: vehicle } = await vehicleQuery
              
              if (vehicle) {
                // Try to get customer data if customer_id exists
                if (vehicle.customer_id) {
                  try {
                    let customerQuery = supabase
                      .from('customers')
                      .select('id, name, phone, email')
                      .eq('id', vehicle.customer_id)
                      .single()

                    if (!isSuper && tenantId) {
                      customerQuery = customerQuery.eq('tenant_id', tenantId)
                    }

                    const { data: customer } = await customerQuery
                    if (customer) {
                      vehicle.customers = customer
                    }
                  } catch (customerError) {
                    // If customer fetch fails, use vehicle_inward customer data as fallback
                    if (vehicleInward.customer_name) {
                      vehicle.customers = {
                        name: vehicleInward.customer_name,
                        phone: vehicleInward.customer_phone,
                        email: vehicleInward.customer_email
                      }
                    }
                  }
                } else if (vehicleInward.customer_name) {
                  // Use vehicle_inward customer data as fallback
                  vehicle.customers = {
                    name: vehicleInward.customer_name,
                    phone: vehicleInward.customer_phone,
                    email: vehicleInward.customer_email
                  }
                }
                
                vehicleInward.vehicles = vehicle
              } else {
                // If vehicle not found, use vehicle_inward data directly
                vehicleInward.vehicles = {
                  registration_number: vehicleInward.registration_number,
                  make: null,
                  model: null,
                  customers: vehicleInward.customer_name ? {
                    name: vehicleInward.customer_name,
                    phone: vehicleInward.customer_phone,
                    email: vehicleInward.customer_email
                  } : null
                }
              }
            } catch (vehicleError) {
              // If vehicle fetch fails, use vehicle_inward data directly
              vehicleInward.vehicles = {
                registration_number: vehicleInward.registration_number,
                make: null,
                model: null,
                customers: vehicleInward.customer_name ? {
                  name: vehicleInward.customer_name,
                  phone: vehicleInward.customer_phone,
                  email: vehicleInward.customer_email
                } : null
              }
            }
          } else {
            // No vehicle_id, use vehicle_inward data directly
            vehicleInward.vehicles = {
              registration_number: vehicleInward.registration_number,
              make: null,
              model: null,
              customers: vehicleInward.customer_name ? {
                name: vehicleInward.customer_name,
                phone: vehicleInward.customer_phone,
                email: vehicleInward.customer_email
              } : null
            }
          }
          
          invoice.vehicle_inward = vehicleInward
        }
      } catch (enrichError) {
        // If enrichment fails, continue without it
        console.warn('[Invoice API] Could not enrich with vehicle_inward data:', enrichError)
      }
    }

    // Enrich line items with department names
    if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
      try {
        // Get all unique department IDs
        const departmentIds = [...new Set(invoice.invoice_line_items
          .map((item: any) => item.department)
          .filter((dept: any) => dept && dept.length > 10) // Likely a UUID
        )]

        if (departmentIds.length > 0) {
          let departmentQuery = supabase
            .from('departments')
            .select('id, name')
            .in('id', departmentIds)

          if (!isSuper && tenantId) {
            departmentQuery = departmentQuery.eq('tenant_id', tenantId)
          }

          const { data: departments } = await departmentQuery
          
          if (departments) {
            const departmentMap = new Map(departments.map((d: any) => [d.id, d.name]))
            
            // Update line items with department names
            invoice.invoice_line_items = invoice.invoice_line_items.map((item: any) => ({
              ...item,
              department_name: departmentMap.get(item.department) || item.department
            }))
          }
        }
      } catch (deptError) {
        console.warn('[Invoice API] Could not enrich department names:', deptError)
      }
    }

    const finalResponse = NextResponse.json({ invoice })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    if (!tenantId && !isSuper) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const body = await request.json()

    // Update invoice directly
    let updateQuery = supabase
      .from('invoices')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (!isSuper && tenantId) {
      updateQuery = updateQuery.eq('tenant_id', tenantId)
    }

    const { data: invoice, error } = await updateQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const finalResponse = NextResponse.json({ invoice })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = NextResponse.next()
  try {
    const supabase = createClientForRouteHandler(request, response)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getTenantIdForUser(user.id, supabase)
    const isSuper = await checkIsSuperAdmin(user.id, supabase)

    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'Cancelled by user'

    // Get current invoice
    let invoiceQuery = supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!isSuper && tenantId) {
      invoiceQuery = invoiceQuery.eq('tenant_id', tenantId)
    }

    const { data: invoice, error: fetchError } = await invoiceQuery

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Cannot cancel paid invoice' }, { status: 400 })
    }

    // Update invoice
    const updateData: any = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason
    }

    let updateQuery = supabase
      .from('invoices')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (!isSuper && tenantId) {
      updateQuery = updateQuery.eq('tenant_id', tenantId)
    }

    const { data: updatedInvoice, error: updateError } = await updateQuery

    if (updateError || !updatedInvoice) {
      return NextResponse.json({ error: updateError?.message || 'Failed to cancel invoice' }, { status: 400 })
    }

    const finalResponse = NextResponse.json({ invoice: updatedInvoice })
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
    return finalResponse
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
