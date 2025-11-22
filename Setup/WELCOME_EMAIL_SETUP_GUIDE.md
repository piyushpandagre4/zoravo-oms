# Welcome Email Setup Guide for ZORAVO OMS

## Overview
This guide will help you configure welcome emails for new tenants using your custom domain.

---

## Step 1: Set Up Resend with Your Domain

### 1.1 Create/Login to Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up or log in to your account
3. Navigate to **Domains** in the sidebar

### 1.2 Add Your Domain
1. Click **"Add Domain"**
2. Enter your domain: `zoravo.in`
3. Resend will provide DNS records to verify your domain

### 1.3 Verify Domain with DNS Records
Add these DNS records to your domain's DNS settings:

**Required Records:**
- **SPF Record** (TXT):
  ```
  v=spf1 include:resend.com ~all
  ```
- **DKIM Record** (TXT):
  ```
  (Resend will provide this - copy the exact value)
  ```
- **DMARC Record** (TXT) - Optional but recommended:
  ```
  v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
  ```

**Where to Add DNS Records:**
- If using **Cloudflare**: DNS → Records → Add Record
- If using **GoDaddy**: DNS Management → Add Record
- If using **Namecheap**: Advanced DNS → Add New Record
- If using **Google Domains**: DNS → Custom Records

### 1.4 Wait for Verification
- DNS propagation can take 24-48 hours
- Check status in Resend dashboard
- Domain status should show "Verified" ✅

---

## Step 2: Configure Environment Variables

### 2.1 Get Your Resend API Key
1. In Resend dashboard, go to **API Keys**
2. Click **"Create API Key"**
3. Name it (e.g., "ZORAVO OMS Production")
4. Copy the API key (starts with `re_`)

### 2.2 Update Environment Variables

**For Local Development** (`.env.local`):
```env
# Application Domain
NEXT_PUBLIC_APP_DOMAIN=zoravo.in

# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@zoravo.in
```

**For Production** (Vercel Dashboard):
1. Go to your Vercel project → Settings → Environment Variables
2. Add/Update:
   - `NEXT_PUBLIC_APP_DOMAIN` = `zoravo.in`
   - `RESEND_API_KEY` = `re_your_api_key_here`
   - `RESEND_FROM_EMAIL` = `noreply@zoravo.in`

**Configured Email Addresses:**
- `noreply@zoravo.in` - For automated emails ✅
- `info@zoravo.in` - Support email (configured as default) ✅
- `hello@zoravo.in` - Friendly option (optional)
- `notifications@zoravo.in` - For system notifications (optional)

---

## Step 3: Update Application Configuration

### 3.1 Update Domain in Welcome Email API

The welcome email API automatically generates login URLs. Make sure your domain is configured correctly:

**File:** `app/api/admin/send-welcome-email/route.ts`

The login URL is generated as:
```typescript
const loginUrl = `https://${tenant.workspace_url}.yourdomain.com/login`
```

**If you're using a single domain** (not subdomains), update line 232:
```typescript
const loginUrl = `https://zoravo.in/login?tenant=${tenant.tenant_code}`
```

### 3.2 Support Email

The support email is configured as `info@zoravo.in` by default. You can:
1. Change it in Admin Settings → Platform Settings → Email Settings
2. Or it will use `info@zoravo.in` automatically if not set

---

## Step 4: Test Welcome Email

### 4.1 Test via Admin Dashboard
1. Go to Admin Dashboard → Tenants
2. Find a tenant
3. Click "Send Welcome Email" button
4. Check the tenant admin's email inbox

### 4.2 Test via API
```bash
curl -X POST https://yourdomain.com/api/admin/send-welcome-email \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "your-tenant-id"}'
```

### 4.3 Check Email Delivery
- Check recipient's inbox (and spam folder)
- Verify email appears to come from your domain
- Check that links work correctly
- Verify branding and content

---

## Step 5: Email Template Customization

### 5.1 Update Email Template
The welcome email template is in `lib/email-service.ts` (function `generateWelcomeEmailHTML`).

**Key Customization Points:**
- **Logo/Branding**: Update colors, logo text
- **Support Email**: Uses `supportEmail` from data
- **Login URL**: Automatically generated from tenant workspace
- **Pricing**: Pulled from subscription data

### 5.2 Update Email Subject
**File:** `lib/email-service.ts` line 54:
```typescript
subject: `Welcome to ZORAVO OMS - Activate Your Account`,
```

---

## Step 6: Automatic Welcome Email on Tenant Creation

### 6.1 Enable Auto-Send (Optional)
To automatically send welcome emails when a tenant is created, update:

**File:** `app/api/tenants/create/route.ts`

Add after tenant creation:
```typescript
// Send welcome email
try {
  await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/send-welcome-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: tenant.id })
  })
} catch (error) {
  console.error('Failed to send welcome email:', error)
  // Don't fail tenant creation if email fails
}
```

---

## Troubleshooting

### Email Not Sending
1. **Check Resend API Key**: Verify it's correct in environment variables
2. **Check Domain Verification**: Ensure domain is verified in Resend
3. **Check DNS Records**: Verify all DNS records are correct
4. **Check Spam Folder**: Emails might be going to spam initially
5. **Check Resend Logs**: View logs in Resend dashboard

### Email Going to Spam
1. **Verify SPF Record**: Must include `include:resend.com`
2. **Verify DKIM Record**: Must match exactly what Resend provides
3. **Add DMARC Record**: Helps with email deliverability
4. **Warm Up Domain**: Send a few test emails first
5. **Check Email Content**: Avoid spam trigger words

### Links Not Working
1. **Check Domain Configuration**: Verify login URLs use correct domain
2. **Check HTTPS**: Ensure SSL certificate is valid
3. **Test Links Manually**: Click each link in the email

### Wrong Email Address
1. **Check RESEND_FROM_EMAIL**: Must match verified domain
2. **Check Resend Domain**: Email must be from verified domain
3. **Format**: Use `name@yourdomain.com` format

---

## Best Practices

1. **Use Subdomain for Email**: Consider `noreply@mail.yourdomain.com` for better organization
2. **Monitor Email Deliverability**: Check Resend dashboard regularly
3. **Test Before Production**: Always test with your own email first
4. **Keep API Key Secure**: Never commit API keys to Git
5. **Use Environment Variables**: Store all sensitive data in environment variables
6. **Monitor Bounce Rates**: Check Resend dashboard for bounces
7. **Update Support Email**: Keep support email address current

---

## Quick Checklist

- [ ] Domain added to Resend
- [ ] DNS records added and verified
- [ ] Resend API key obtained
- [ ] Environment variables updated (local and production)
- [ ] RESEND_FROM_EMAIL set to verified domain email
- [ ] Test email sent and received
- [ ] Links in email work correctly
- [ ] Email doesn't go to spam
- [ ] Support email address updated
- [ ] Welcome email template customized (if needed)

---

## Support

If you encounter issues:
1. Check Resend dashboard for error messages
2. Review application logs for API errors
3. Verify all environment variables are set correctly
4. Test with a simple email first before welcome email

---

## Next Steps

After setting up welcome emails:
1. Set up password reset emails (already configured)
2. Configure daily report emails
3. Set up notification preferences
4. Test all email flows

---

**Last Updated:** November 2025

