import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export interface DailyReportEmailData {
  managerName: string
  managerEmail: string
  reportDate: string
  nextDayCount: number
  pendingCount: number
  pdfBuffer: Buffer
  tenantName?: string
}

interface WelcomeEmailData {
  tenantName: string
  adminName: string
  adminEmail: string
  workspaceUrl: string
  loginUrl: string
  pricingAmount: number
  currency: string
  supportEmail?: string
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'social@sunkool.in'
    
    // Ensure supportEmail is set in data
    const emailData = {
      ...data,
      supportEmail: data.supportEmail || 'social@sunkool.in'
    }

    const emailHtml = generateWelcomeEmailHTML(emailData)

    const result = await resend.emails.send({
      from: fromEmail,
      to: data.adminEmail,
      subject: `Welcome to ZORAVO OMS - Activate Your Account`,
      html: emailHtml,
    })

    return { success: true, messageId: result.data?.id }
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    throw new Error(error.message || 'Failed to send email')
  }
}

function generateWelcomeEmailHTML(data: WelcomeEmailData): string {
  const pricingDisplay = data.currency === 'INR' 
    ? `₹${data.pricingAmount.toLocaleString('en-IN')}/year`
    : `$${data.pricingAmount}/year`
  
  const supportEmail = data.supportEmail || 'social@sunkool.in'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ZORAVO OMS</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
        }
        .content {
            margin-bottom: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            border-left: 4px solid #2563eb;
            padding-left: 12px;
        }
        .section-content {
            color: #4b5563;
            line-height: 1.8;
        }
        .pricing-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
        }
        .pricing-amount {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .pricing-period {
            font-size: 16px;
            opacity: 0.9;
        }
        .features {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        .features li {
            padding: 10px 0;
            padding-left: 30px;
            position: relative;
        }
        .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #059669;
            font-weight: bold;
            font-size: 18px;
        }
        .cta-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #1d4ed8;
        }
        .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box strong {
            color: #1e40af;
        }
        .steps {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .step {
            margin-bottom: 15px;
            padding-left: 30px;
            position: relative;
        }
        .step-number {
            position: absolute;
            left: 0;
            background-color: #2563eb;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">ZORAVO</div>
            <div class="title">Welcome to ZORAVO OMS!</div>
            <div class="subtitle">Your Complete Order Management Solution</div>
        </div>

        <div class="content">
            <div class="greeting">
                Hello ${data.adminName || 'Valued Customer'},
            </div>

            <div class="section">
                <div class="section-content">
                    We're thrilled to welcome <strong>${data.tenantName}</strong> to ZORAVO OMS! 
                    Your workspace is ready at <strong>${data.workspaceUrl}.zoravo.com</strong>.
                </div>
            </div>

            <div class="pricing-box">
                <div class="pricing-amount">${pricingDisplay}</div>
                <div class="pricing-period">Annual Subscription Plan</div>
            </div>

            <div class="section">
                <div class="section-title">🚀 What You Get</div>
                <ul class="features">
                    <li>Complete Order Management System</li>
                    <li>Multi-user Access & Role Management</li>
                    <li>Real-time Tracking & Notifications</li>
                    <li>Customer Management & Requirements</li>
                    <li>Invoice & Payment Tracking</li>
                    <li>WhatsApp Integration</li>
                    <li>Advanced Analytics & Reports</li>
                    <li>Priority Support</li>
                </ul>
            </div>

            <div class="section">
                <div class="section-title">📋 How to Activate Your Account</div>
                <div class="steps">
                    <div class="step">
                        <div class="step-number">1</div>
                        <div><strong>Login to Your Workspace</strong><br>
                        Visit: <a href="${data.loginUrl}" style="color: #2563eb;">${data.loginUrl}</a></div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div><strong>Complete Your Profile</strong><br>
                        Set up your company details and preferences</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div><strong>Submit Payment Proof</strong><br>
                        Go to Settings → Payment & Subscription and upload your payment receipt</div>
                    </div>
                    <div class="step">
                        <div class="step-number">4</div>
                        <div><strong>Get Activated</strong><br>
                        Our team will review and activate your account within 24 hours</div>
                    </div>
                </div>
            </div>

            <div class="info-box">
                <strong>💡 Payment Information:</strong><br>
                Amount: ${pricingDisplay}<br>
                Payment Method: Bank Transfer / UPI / Online Payment<br>
                After payment, please submit your payment proof through the platform for quick activation.
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.loginUrl}" class="cta-button">Access Your Workspace</a>
            </div>

            <div class="section">
                <div class="section-title">💬 Need Help?</div>
                <div class="section-content">
                    Our support team is here to help you get started. If you have any questions or need assistance:
                    <ul style="margin-top: 10px;">
                        <li>Email us at: <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a></li>
                        <li>Check out our documentation and guides in the platform</li>
                        <li>Reach out through the support section in your dashboard</li>
                    </ul>
                </div>
            </div>

            <div class="section">
                <div class="section-content" style="font-size: 14px; color: #6b7280;">
                    <strong>Important:</strong> Your account is currently in trial mode. To continue using all features 
                    after the trial period, please complete the payment and submit your payment proof.
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for choosing ZORAVO OMS!</p>
            <p>Best regards,<br><strong>The ZORAVO Team</strong></p>
            <p style="margin-top: 20px; font-size: 12px;">
                This is an automated email. Please do not reply directly to this message.<br>
                For support, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
        </div>
    </div>
</body>
</html>
  ` 
}

/**
 * Send daily vehicle report email with PDF attachment
 */
export async function sendDailyReportEmail(data: DailyReportEmailData) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'social@sunkool.in'
    
    const emailHtml = generateDailyReportEmailHTML(data)

    const result = await resend.emails.send({
      from: fromEmail,
      to: data.managerEmail,
      subject: `Daily Vehicle Report - ${data.reportDate} | ZORAVO OMS`,
      html: emailHtml,
      attachments: [
        {
          filename: `daily-vehicle-report-${data.reportDate.replace(/\//g, '-')}.pdf`,
          content: data.pdfBuffer.toString('base64'),
        },
      ],
    })

    return { success: true, messageId: result.data?.id }
  } catch (error: any) {
    console.error('Error sending daily report email:', error)
    throw new Error(error.message || 'Failed to send daily report email')
  }
}

function generateDailyReportEmailHTML(data: DailyReportEmailData): string {
  const totalVehicles = data.nextDayCount + data.pendingCount
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Vehicle Report - ZORAVO OMS</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 14px;
            color: #6b7280;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #374151;
        }
        .summary-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
        }
        .summary-number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .summary-label {
            font-size: 14px;
            opacity: 0.9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid;
        }
        .stat-card.next-day {
            border-left-color: #059669;
        }
        .stat-card.pending {
            border-left-color: #f59e0b;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
        }
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
        }
        .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box strong {
            color: #1e40af;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">ZORAVO OMS</div>
            <div class="title">Daily Vehicle Report</div>
            <div class="subtitle">${data.reportDate}</div>
        </div>

        <div class="greeting">
            Hello <strong>${data.managerName}</strong>,
        </div>

        <div class="info-box">
            <strong>📋 Report Summary:</strong><br>
            Your daily vehicle report for <strong>${data.reportDate}</strong> is ready. 
            ${totalVehicles > 0 
              ? `You have <strong>${totalVehicles} vehicle(s)</strong> requiring your attention.` 
              : 'No vehicles require immediate attention.'}
        </div>

        ${totalVehicles > 0 ? `
        <div class="stats-grid">
            <div class="stat-card next-day">
                <div class="stat-number">${data.nextDayCount}</div>
                <div class="stat-label">Vehicles for Tomorrow</div>
            </div>
            <div class="stat-card pending">
                <div class="stat-number">${data.pendingCount}</div>
                <div class="stat-label">Pending Vehicles</div>
            </div>
        </div>
        ` : ''}

        <div class="summary-box">
            <div class="summary-number">${totalVehicles}</div>
            <div class="summary-label">Total Vehicles in Report</div>
        </div>

        <div class="info-box">
            <strong>📎 PDF Attachment:</strong><br>
            A detailed PDF report has been attached to this email with complete vehicle information, 
            including customer details, vehicle specifications, status, and priority levels.
        </div>

        <div style="margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 6px;">
            <strong style="color: #1f2937;">What's included in the PDF:</strong>
            <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
                <li>Complete vehicle and customer information</li>
                <li>Expected completion dates</li>
                <li>Status and priority levels</li>
                <li>Issues reported and accessories requested</li>
                <li>Estimated costs</li>
            </ul>
        </div>

        <div class="footer">
            <p>This is an automated daily report from ZORAVO OMS.</p>
            <p>For support, contact: ${process.env.RESEND_FROM_EMAIL || 'social@sunkool.in'}</p>
            <p style="margin-top: 15px; font-size: 11px; color: #9ca3af;">
                Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
        </div>
    </div>
</body>
</html>
  `
}

