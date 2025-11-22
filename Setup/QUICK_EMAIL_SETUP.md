# Quick Welcome Email Setup - ZORAVO OMS

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Resend API Key
1. Go to [resend.com](https://resend.com) and sign up/login
2. Go to **API Keys** → **Create API Key**
3. Copy your API key (starts with `re_`)

### Step 2: Add Your Domain to Resend
1. In Resend dashboard, go to **Domains** → **Add Domain**
2. Enter your domain (e.g., `yourdomain.com`)
3. Add the DNS records Resend provides to your domain's DNS settings
4. Wait for verification (usually 5-30 minutes)

### Step 3: Update Environment Variables

**Add to `.env.local` (for local development):**
```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@zoravo.in
NEXT_PUBLIC_APP_DOMAIN=zoravo.in
```

**Add to Vercel (for production):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these three variables:
   - `RESEND_API_KEY` = `re_your_api_key_here`
   - `RESEND_FROM_EMAIL` = `noreply@yourdomain.com`
   - `NEXT_PUBLIC_APP_DOMAIN` = `yourdomain.com`

### Step 4: Test It!
1. Go to Admin Dashboard → Tenants
2. Click "Send Welcome Email" on any tenant
3. Check the tenant admin's email inbox

---

## 📧 Email Address Options

Choose one of these for `RESEND_FROM_EMAIL`:
- `noreply@zoravo.in` ✅ Recommended for automated emails
- `info@zoravo.in` - Support email (already configured)
- `hello@zoravo.in` - Friendly option
- `notifications@zoravo.in` - For system notifications

**Important:** The email must be from your verified domain in Resend!

---

## ✅ That's It!

Your welcome emails are now configured. The system will:
- ✅ Send branded welcome emails to new tenants
- ✅ Include login links with your domain
- ✅ Use your custom email address
- ✅ Include all tenant details and activation steps

---

## 🔧 Troubleshooting

**Email not sending?**
- Check Resend dashboard for errors
- Verify domain is verified in Resend
- Check environment variables are set correctly

**Email going to spam?**
- Make sure DNS records (SPF, DKIM) are added correctly
- Wait 24-48 hours for DNS propagation
- Send a few test emails to warm up the domain

**Need more help?**
- See `WELCOME_EMAIL_SETUP_GUIDE.md` for detailed instructions
- Check Resend documentation: [resend.com/docs](https://resend.com/docs)

