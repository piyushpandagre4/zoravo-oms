# Vercel Custom Domain Setup Guide - ZORAVO OMS

## Overview
This guide will help you connect your custom domain `zoravo.in` to your Vercel deployment so your application can be accessed through your domain.

---

## Step 1: Add Domain to Vercel

### 1.1 Navigate to Your Project
1. Go to [vercel.com](https://vercel.com) and log in
2. Select your **ZORAVO OMS** project
3. Go to **Settings** → **Domains** (in the left sidebar)

### 1.2 Add Your Domain
1. Click **"Add Domain"** button
2. Enter your domain: `zoravo.in`
3. Click **"Add"**

### 1.3 Add Subdomain (Optional - for workspace support)
If you want to support workspace subdomains (e.g., `workspace.zoravo.in`):
1. Click **"Add Domain"** again
2. Enter: `*.zoravo.in` (wildcard subdomain)
3. Click **"Add"**

**Note:** Wildcard subdomains allow any workspace to have its own subdomain automatically.

---

## Step 2: Configure DNS Records

Vercel will provide you with DNS records to add. You'll see something like:

### Option A: Using A Record (Recommended)
```
Type: A
Name: @
Value: 76.76.21.21
```

### Option B: Using CNAME Record
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**For Subdomain Support (if using wildcard):**
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

---

## Step 3: Add DNS Records to Your Domain Provider

### 3.1 Find Your Domain Provider
Common providers:
- **Cloudflare**
- **GoDaddy**
- **Namecheap**
- **Google Domains**
- **Route 53 (AWS)**

### 3.2 Add DNS Records

**For Cloudflare:**
1. Go to your domain → **DNS** → **Records**
2. Click **"Add Record"**
3. Add the A or CNAME record Vercel provided
4. Click **"Save"**

**For GoDaddy:**
1. Go to **My Products** → Your Domain → **DNS**
2. Click **"Add"** under DNS Records
3. Add the record Vercel provided
4. Click **"Save"**

**For Namecheap:**
1. Go to **Domain List** → **Manage** → **Advanced DNS**
2. Click **"Add New Record"**
3. Add the record Vercel provided
4. Click **"Save"**

---

## Step 4: Wait for DNS Propagation

### 4.1 Verification Time
- DNS propagation typically takes **5 minutes to 48 hours**
- Usually completes within **15-30 minutes**
- Vercel will show status: **"Valid Configuration"** ✅

### 4.2 Check Status
1. Go back to Vercel → **Settings** → **Domains**
2. You'll see the status:
   - ⏳ **Pending** - DNS is propagating
   - ✅ **Valid Configuration** - Domain is ready!
   - ❌ **Invalid Configuration** - Check DNS records

---

## Step 5: SSL Certificate (Automatic)

### 5.1 Automatic SSL
- Vercel automatically provisions SSL certificates via **Let's Encrypt**
- SSL is enabled automatically once DNS is verified
- Your site will be accessible via `https://zoravo.in`

### 5.2 Force HTTPS (Optional)
Vercel automatically redirects HTTP to HTTPS, but you can verify:
1. Go to **Settings** → **Domains**
2. Ensure **"Force HTTPS"** is enabled (default)

---

## Step 6: Update Environment Variables

### 6.1 Add Domain to Environment Variables
1. Go to Vercel → **Settings** → **Environment Variables**
2. Add/Update:
   ```
   NEXT_PUBLIC_APP_DOMAIN=zoravo.in
   ```
3. Make sure it's set for **Production**, **Preview**, and **Development**
4. Click **"Save"**

### 6.2 Redeploy
After adding the environment variable:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger automatic deployment

---

## Step 7: Test Your Domain

### 7.1 Test Main Domain
1. Open `https://zoravo.in` in your browser
2. Verify the application loads correctly
3. Test login functionality

### 7.2 Test Subdomain (if configured)
1. Open `https://workspace-name.zoravo.in` (replace with actual workspace)
2. Verify workspace detection works
3. Test tenant-specific features

---

## Step 8: Update Application Configuration

### 8.1 Verify Domain in Code
The application already uses `NEXT_PUBLIC_APP_DOMAIN` environment variable, so once you set it in Vercel, it will automatically use your domain.

### 8.2 Check Email Links
- Welcome emails will use `zoravo.in` domain
- Password reset emails will use `zoravo.in` domain
- All links will automatically use your custom domain

---

## Troubleshooting

### Domain Not Resolving
1. **Check DNS Records**: Verify records are added correctly
2. **Wait for Propagation**: DNS can take up to 48 hours
3. **Check DNS Status**: Use tools like `nslookup zoravo.in` or [whatsmydns.net](https://www.whatsmydns.net)

### SSL Certificate Issues
1. **Wait for DNS**: SSL is provisioned after DNS verification
2. **Check Domain Status**: Ensure domain shows "Valid Configuration"
3. **Contact Support**: If issues persist after 24 hours

### Subdomain Not Working
1. **Check Wildcard Record**: Ensure `*.zoravo.in` CNAME is added
2. **Verify Environment Variable**: `NEXT_PUBLIC_APP_DOMAIN=zoravo.in`
3. **Check Middleware**: Verify middleware.ts handles subdomains correctly

### Application Not Loading
1. **Check Deployment**: Ensure latest deployment is successful
2. **Check Environment Variables**: Verify all required variables are set
3. **Check Build Logs**: Review deployment logs for errors

---

## DNS Record Examples

### For Root Domain (zoravo.in)
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto (or 3600)
```

### For Wildcard Subdomain (*.zoravo.in)
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
TTL: Auto (or 3600)
```

### For WWW Subdomain (www.zoravo.in) - Optional
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto (or 3600)
```

---

## Quick Checklist

- [ ] Domain added to Vercel project
- [ ] DNS records added to domain provider
- [ ] DNS propagation completed (status shows "Valid Configuration")
- [ ] SSL certificate provisioned (automatic)
- [ ] `NEXT_PUBLIC_APP_DOMAIN=zoravo.in` added to Vercel environment variables
- [ ] Application redeployed after adding environment variable
- [ ] Main domain (`zoravo.in`) tested and working
- [ ] Subdomain tested (if configured)
- [ ] HTTPS working correctly
- [ ] Email links use correct domain

---

## Important Notes

1. **DNS Propagation**: Can take 5 minutes to 48 hours (usually 15-30 minutes)
2. **SSL Certificate**: Automatically provisioned by Vercel (free)
3. **Environment Variables**: Must be set in Vercel for domain to work correctly
4. **Redeploy Required**: After adding `NEXT_PUBLIC_APP_DOMAIN`, redeploy the application
5. **Subdomain Support**: Wildcard subdomain (`*.zoravo.in`) enables automatic workspace subdomains

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify DNS records are correct
3. Wait for DNS propagation (can take up to 48 hours)
4. Contact Vercel support if issues persist

---

## Next Steps

After domain is configured:
1. ✅ Update email templates to use `zoravo.in`
2. ✅ Test all email links
3. ✅ Verify workspace subdomain detection
4. ✅ Update any hardcoded URLs in documentation
5. ✅ Test password reset flow with new domain

---

**Last Updated:** November 2025

