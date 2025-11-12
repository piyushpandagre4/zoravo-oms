import PDFDocument from 'pdfkit'
import { Readable } from 'stream'

export interface VehicleReportData {
  id: string
  shortId?: string
  customerName: string
  customerPhone: string
  registrationNumber: string
  model: string
  make?: string
  color?: string
  year?: number
  estimatedCompletionDate?: string
  status: string
  priority?: string
  issuesReported?: string
  accessoriesRequested?: string
  estimatedCost?: number
  notes?: string
  createdAt: string
}

export interface DailyReportData {
  managerName: string
  managerEmail: string
  reportDate: string
  nextDayVehicles: VehicleReportData[]
  pendingVehicles: VehicleReportData[]
  tenantName?: string
}

/**
 * Generate PDF buffer for daily vehicle report
 */
export async function generateDailyReportPDF(data: DailyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      })

      const buffers: Buffer[] = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text('ZORAVO OMS - Daily Vehicle Report', { align: 'center' })
      
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica')
        .fillColor('#6b7280')
        .text(`Report Date: ${data.reportDate}`, { align: 'center' })
      
      if (data.tenantName) {
        doc.fontSize(10)
          .text(`Tenant: ${data.tenantName}`, { align: 'center' })
      }

      doc.moveDown(1)
      doc.fontSize(14).font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text(`Manager: ${data.managerName}`, { align: 'left' })
      
      doc.fontSize(10).font('Helvetica')
        .fillColor('#6b7280')
        .text(`Email: ${data.managerEmail}`, { align: 'left' })

      doc.moveDown(1.5)

      // Next Day Vehicles Section
      if (data.nextDayVehicles.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
          .fillColor('#059669')
          .text('Vehicles Scheduled for Tomorrow', { underline: true })
        
        doc.moveDown(0.5)
        
        data.nextDayVehicles.forEach((vehicle, index) => {
          addVehicleSection(doc, vehicle, index + 1, data.nextDayVehicles.length)
        })
      }

      // Pending Vehicles Section
      if (data.pendingVehicles.length > 0) {
        if (data.nextDayVehicles.length > 0) {
          doc.addPage()
        }
        
        doc.fontSize(16).font('Helvetica-Bold')
          .fillColor('#f59e0b')
          .text('Pending Vehicles', { underline: true })
        
        doc.moveDown(0.5)
        
        data.pendingVehicles.forEach((vehicle, index) => {
          addVehicleSection(doc, vehicle, index + 1, data.pendingVehicles.length)
        })
      }

      // Summary
      doc.addPage()
      doc.fontSize(14).font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text('Summary', { underline: true })
      
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')
        .fillColor('#374151')
        .text(`Total Vehicles for Tomorrow: ${data.nextDayVehicles.length}`, { indent: 20 })
        .text(`Total Pending Vehicles: ${data.pendingVehicles.length}`, { indent: 20 })
        .text(`Grand Total: ${data.nextDayVehicles.length + data.pendingVehicles.length}`, { indent: 20 })

      // Footer
      doc.fontSize(8).font('Helvetica')
        .fillColor('#9ca3af')
        .text(
          `Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | ZORAVO OMS`,
          { align: 'center' }
        )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function addVehicleSection(
  doc: PDFKit.PDFDocument,
  vehicle: VehicleReportData,
  index: number,
  total: number
) {
  const startY = doc.y
  
  // Vehicle header box
  doc.rect(50, startY, 495, 80)
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .stroke()
  
  // Vehicle number and ID
  doc.fontSize(12).font('Helvetica-Bold')
    .fillColor('#1f2937')
    .text(`${index}. ${vehicle.registrationNumber}`, 60, startY + 10)
  
  if (vehicle.shortId) {
    doc.fontSize(9).font('Helvetica')
      .fillColor('#6b7280')
      .text(`ID: ${vehicle.shortId}`, 60, startY + 25)
  }

  // Customer info
  doc.fontSize(10).font('Helvetica-Bold')
    .fillColor('#374151')
    .text('Customer:', 60, startY + 40)
  
  doc.fontSize(10).font('Helvetica')
    .fillColor('#4b5563')
    .text(`${vehicle.customerName}`, 120, startY + 40)
    .text(`Phone: ${vehicle.customerPhone}`, 120, startY + 55)

  // Vehicle details (right side)
  const rightX = 300
  doc.fontSize(9).font('Helvetica')
    .fillColor('#6b7280')
    .text(`Model: ${vehicle.model}`, rightX, startY + 10)
  
  if (vehicle.make) {
    doc.text(`Make: ${vehicle.make}`, rightX, startY + 23)
  }
  
  if (vehicle.color) {
    doc.text(`Color: ${vehicle.color}`, rightX, startY + 36)
  }
  
  if (vehicle.year) {
    doc.text(`Year: ${vehicle.year}`, rightX, startY + 49)
  }

  // Status and Priority
  const statusColor = getStatusColor(vehicle.status)
  doc.fontSize(9).font('Helvetica-Bold')
    .fillColor(statusColor)
    .text(`Status: ${vehicle.status.toUpperCase()}`, rightX, startY + 62)
  
  if (vehicle.priority) {
    const priorityColor = getPriorityColor(vehicle.priority)
    doc.fillColor(priorityColor)
      .text(`Priority: ${vehicle.priority.toUpperCase()}`, rightX + 150, startY + 62)
  }

  // Additional details below
  let currentY = startY + 90
  
  if (vehicle.estimatedCompletionDate) {
    doc.fontSize(9).font('Helvetica')
      .fillColor('#059669')
      .text(`Expected Completion: ${new Date(vehicle.estimatedCompletionDate).toLocaleDateString('en-IN')}`, 60, currentY)
    currentY += 15
  }

  if (vehicle.estimatedCost) {
    doc.fontSize(9).font('Helvetica')
      .fillColor('#1f2937')
      .text(`Estimated Cost: ₹${vehicle.estimatedCost.toLocaleString('en-IN')}`, 60, currentY)
    currentY += 15
  }

  if (vehicle.issuesReported) {
    doc.fontSize(9).font('Helvetica-Bold')
      .fillColor('#374151')
      .text('Issues Reported:', 60, currentY)
    doc.fontSize(8).font('Helvetica')
      .fillColor('#4b5563')
      .text(vehicle.issuesReported.substring(0, 100) + (vehicle.issuesReported.length > 100 ? '...' : ''), 60, currentY + 12, {
        width: 480,
        ellipsis: true
      })
    currentY += 30
  }

  if (vehicle.accessoriesRequested) {
    doc.fontSize(9).font('Helvetica-Bold')
      .fillColor('#374151')
      .text('Accessories Requested:', 60, currentY)
    doc.fontSize(8).font('Helvetica')
      .fillColor('#4b5563')
      .text(vehicle.accessoriesRequested.substring(0, 100) + (vehicle.accessoriesRequested.length > 100 ? '...' : ''), 60, currentY + 12, {
        width: 480,
        ellipsis: true
      })
    currentY += 30
  }

  if (vehicle.notes) {
    doc.fontSize(9).font('Helvetica-Bold')
      .fillColor('#374151')
      .text('Notes:', 60, currentY)
    doc.fontSize(8).font('Helvetica')
      .fillColor('#4b5563')
      .text(vehicle.notes.substring(0, 100) + (vehicle.notes.length > 100 ? '...' : ''), 60, currentY + 12, {
        width: 480,
        ellipsis: true
      })
    currentY += 30
  }

  doc.moveDown(1)
  
  // Add separator line if not last
  if (index < total) {
    doc.moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke()
    doc.moveDown(0.5)
  }
}

function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('pending')) return '#f59e0b'
  if (statusLower.includes('progress')) return '#2563eb'
  if (statusLower.includes('complete')) return '#059669'
  if (statusLower.includes('delivered')) return '#10b981'
  return '#6b7280'
}

function getPriorityColor(priority: string): string {
  const priorityLower = priority.toLowerCase()
  if (priorityLower === 'high') return '#dc2626'
  if (priorityLower === 'medium') return '#f59e0b'
  if (priorityLower === 'low') return '#059669'
  return '#6b7280'
}

