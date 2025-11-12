import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateDailyReportPDF, VehicleReportData } from '@/lib/pdf-service'
import { sendDailyReportEmail } from '@/lib/email-service'
import { sendDailyReportViaWhatsApp, getManagerPhoneNumber } from '@/lib/whatsapp-report-service'

/**
 * API Route: POST /api/reports/daily-vehicle-report
 * 
 * Generates and sends daily vehicle reports to managers/coordinators
 * 
 * This endpoint should be called daily (via cron job) to send reports
 * 
 * Query Parameters:
 * - tenantId (optional): Specific tenant ID, if not provided, processes all tenants
 * - test (optional): If true, sends test email to verify functionality
 * 
 * Headers:
 * - Authorization: Bearer token (optional, for security)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const isTest = searchParams.get('test') === 'true'

    // Get all tenants (or specific tenant)
    let tenantsQuery = supabase
      .from('tenants')
      .select('id, name, workspace_url, is_active')
      .eq('is_active', true)
    
    if (tenantId) {
      tenantsQuery = tenantsQuery.eq('id', tenantId)
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`)
    }

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active tenants found',
        reportsSent: 0
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)

    const reportDate = today.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let totalReportsSent = 0
    let totalWhatsAppSent = 0
    let totalEmailSent = 0
    const errors: string[] = []
    const whatsappErrors: string[] = []

    // Process each tenant
    for (const tenant of tenants) {
      try {
        // Get all managers and coordinators for this tenant
        // First get tenant_users, then fetch profiles
        const { data: tenantUsers, error: tenantUsersError } = await supabase
          .from('tenant_users')
          .select('user_id, role')
          .eq('tenant_id', tenant.id)
          .in('role', ['manager', 'coordinator'])

        if (tenantUsersError) {
          console.error(`Error fetching tenant users for tenant ${tenant.id}:`, tenantUsersError)
          continue
        }

        if (!tenantUsers || tenantUsers.length === 0) {
          continue
        }

        // Get user IDs and fetch profiles
        const userIds = tenantUsers.map(tu => tu.user_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, name, role')
          .in('id', userIds)

        if (profilesError) {
          console.error(`Error fetching profiles for tenant ${tenant.id}:`, profilesError)
          continue
        }

        if (!profiles || profiles.length === 0) {
          continue
        }

        // Map tenant_users with profiles to create managers array
        const managers = tenantUsers
          .map(tu => {
            const profile = profiles.find(p => p.id === tu.user_id)
            if (!profile) return null
            return {
              id: profile.id,
              email: profile.email,
              name: profile.name || profile.email,
              role: tu.role || profile.role
            }
          })
          .filter((m): m is { id: string; email: string; name: string; role: string } => m !== null)

        if (managers.length === 0) {
          continue
        }

        // Process each manager/coordinator
        for (const manager of managers) {
          try {
            // Get vehicles assigned to this manager for tomorrow
            let nextDayQuery = supabase
              .from('vehicle_inward')
              .select(`
                id,
                short_id,
                customer_name,
                customer_phone,
                registration_number,
                model,
                make,
                color,
                year,
                estimated_completion_date,
                status,
                priority,
                issues_reported,
                accessories_requested,
                estimated_cost,
                notes,
                created_at
              `)
              .eq('tenant_id', tenant.id)
              .eq('assigned_manager_id', manager.id)
              .eq('estimated_completion_date', tomorrow.toISOString().split('T')[0])
              .neq('status', 'complete_and_delivered')
              .neq('status', 'delivered')

            const { data: nextDayVehicles, error: nextDayError } = await nextDayQuery

            if (nextDayError) {
              console.error(`Error fetching next day vehicles:`, nextDayError)
              continue
            }

            // Get pending vehicles assigned to this manager
            let pendingQuery = supabase
              .from('vehicle_inward')
              .select(`
                id,
                short_id,
                customer_name,
                customer_phone,
                registration_number,
                model,
                make,
                color,
                year,
                estimated_completion_date,
                status,
                priority,
                issues_reported,
                accessories_requested,
                estimated_cost,
                notes,
                created_at
              `)
              .eq('tenant_id', tenant.id)
              .eq('assigned_manager_id', manager.id)
              .eq('status', 'pending')

            const { data: pendingVehicles, error: pendingError } = await pendingQuery

            if (pendingError) {
              console.error(`Error fetching pending vehicles:`, pendingError)
              continue
            }

            const nextDayVehiclesData: VehicleReportData[] = (nextDayVehicles || []).map(v => ({
              id: v.id,
              shortId: v.short_id,
              customerName: v.customer_name || 'N/A',
              customerPhone: v.customer_phone || 'N/A',
              registrationNumber: v.registration_number || 'N/A',
              model: v.model || 'N/A',
              make: v.make,
              color: v.color,
              year: v.year,
              estimatedCompletionDate: v.estimated_completion_date,
              status: v.status || 'pending',
              priority: v.priority,
              issuesReported: v.issues_reported,
              accessoriesRequested: v.accessories_requested,
              estimatedCost: v.estimated_cost ? parseFloat(v.estimated_cost) : undefined,
              notes: v.notes,
              createdAt: v.created_at
            }))

            const pendingVehiclesData: VehicleReportData[] = (pendingVehicles || []).map(v => ({
              id: v.id,
              shortId: v.short_id,
              customerName: v.customer_name || 'N/A',
              customerPhone: v.customer_phone || 'N/A',
              registrationNumber: v.registration_number || 'N/A',
              model: v.model || 'N/A',
              make: v.make,
              color: v.color,
              year: v.year,
              estimatedCompletionDate: v.estimated_completion_date,
              status: v.status || 'pending',
              priority: v.priority,
              issuesReported: v.issues_reported,
              accessoriesRequested: v.accessories_requested,
              estimatedCost: v.estimated_cost ? parseFloat(v.estimated_cost) : undefined,
              notes: v.notes,
              createdAt: v.created_at
            }))

            // Skip if no vehicles (unless test mode)
            if (nextDayVehiclesData.length === 0 && pendingVehiclesData.length === 0 && !isTest) {
              continue
            }

            // Generate PDF
            const pdfBuffer = await generateDailyReportPDF({
              managerName: manager.name || manager.email,
              managerEmail: manager.email,
              reportDate,
              nextDayVehicles: nextDayVehiclesData,
              pendingVehicles: pendingVehiclesData,
              tenantName: tenant.name
            })

            // Get manager phone number for WhatsApp (with tenant context)
            const managerPhone = await getManagerPhoneNumber(manager.id, tenant.id)

            // Send reports via BOTH WhatsApp and Email
            const sendPromises: Promise<any>[] = []

            // Always send via Email
            sendPromises.push(
              sendDailyReportEmail({
                managerName: manager.name || manager.email,
                managerEmail: manager.email,
                reportDate,
                nextDayCount: nextDayVehiclesData.length,
                pendingCount: pendingVehiclesData.length,
                pdfBuffer,
                tenantName: tenant.name
              })
              .then(() => {
                totalEmailSent++
                console.log(`✅ [Tenant: ${tenant.name}] Email report sent to ${manager.email}`)
              })
              .catch((error: any) => {
                const errorMsg = `[Tenant: ${tenant.name}] Email failed for ${manager.email}: ${error.message}`
                console.error(`❌ ${errorMsg}`)
                errors.push(errorMsg)
              })
            )

            // Send via WhatsApp if phone number available
            if (managerPhone) {
              sendPromises.push(
                sendDailyReportViaWhatsApp({
                  managerName: manager.name || manager.email,
                  managerPhone,
                  reportDate,
                  nextDayCount: nextDayVehiclesData.length,
                  pendingCount: pendingVehiclesData.length,
                  pdfBuffer,
                  tenantName: tenant.name
                }, tenant.id)
                .then((result) => {
                  if (result.success) {
                    totalWhatsAppSent++
                    console.log(`✅ [Tenant: ${tenant.name}] WhatsApp report sent to ${managerPhone} (${manager.name || manager.email})`)
                  } else {
                    const errorMsg = `[Tenant: ${tenant.name}] WhatsApp failed for ${managerPhone}: ${result.error}`
                    console.warn(`⚠️ ${errorMsg}`)
                    whatsappErrors.push(errorMsg)
                  }
                })
                .catch((error: any) => {
                  const errorMsg = `[Tenant: ${tenant.name}] WhatsApp error for ${managerPhone}: ${error.message}`
                  console.error(`❌ ${errorMsg}`)
                  whatsappErrors.push(errorMsg)
                })
              )
            } else {
              whatsappErrors.push(`[Tenant: ${tenant.name}] No WhatsApp number found for ${manager.email}`)
            }

            // Wait for both to complete (don't fail if one fails)
            await Promise.allSettled(sendPromises)

            totalReportsSent++

          } catch (error: any) {
            const errorMsg = `Error processing manager ${manager.email}: ${error.message}`
            console.error(errorMsg, error)
            errors.push(errorMsg)
          }
        }
      } catch (error: any) {
        const errorMsg = `Error processing tenant ${tenant.id}: ${error.message}`
        console.error(errorMsg, error)
        errors.push(errorMsg)
      }
    }

    // Summary logged in response

    return NextResponse.json({
      success: true,
      message: `Daily vehicle reports processed`,
      reportsSent: totalReportsSent,
      emailSent: totalEmailSent,
      whatsappSent: totalWhatsAppSent,
      errors: errors.length > 0 ? errors : undefined,
      whatsappErrors: whatsappErrors.length > 0 ? whatsappErrors : undefined
    })

  } catch (error: any) {
    console.error('Error in daily vehicle report API:', error)
    return NextResponse.json(
      {
        error: 'Failed to process daily vehicle reports',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}

