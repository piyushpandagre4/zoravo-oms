# Quick Domain Setup - zoravo.in on Vercel

## 🚀 5-Minute Setup

### Step 1: Add Domain in Vercel (2 minutes)
1. Go to [vercel.com](https://vercel.com) → Your Project
2. Click **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter: `zoravo.in`
5. Click **"Add"**

### Step 2: Add DNS Record (2 minutes)
Vercel will show you DNS records. Add this to your domain provider:

**For Root Domain:**
```
Type: A
Name: @
Value: (Vercel will provide - usually 76.76.21.21)
```

**OR**

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

**For Subdomain Support (Optional):**
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

### Step 3: Add Environment Variable (1 minute)
1. Vercel → **Settings** → **Environment Variables**
2. Add:
   - Name: `NEXT_PUBLIC_APP_DOMAIN`
   - Value: `zoravo.in`
   - Apply to: **Production**, **Preview**, **Development**
3. Click **"Save"**

### Step 4: Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. Wait for deployment to complete

### Step 5: Wait & Test
- Wait 5-30 minutes for DNS propagation
- Check Vercel → **Settings** → **Domains** for status
- When status shows ✅ **"Valid Configuration"**, test:
  - `https://zoravo.in` - Should load your app!

---

## ✅ That's It!

Your domain is now connected! The application will:
- ✅ Be accessible at `https://zoravo.in`
- ✅ Automatically use `zoravo.in` in all email links
- ✅ Support workspace subdomains (if wildcard configured)
- ✅ Have SSL certificate automatically (HTTPS)

---

## 📋 Quick Checklist

- [ ] Domain added in Vercel
- [ ] DNS record added to domain provider
- [ ] `NEXT_PUBLIC_APP_DOMAIN=zoravo.in` added to Vercel
- [ ] Application redeployed
- [ ] DNS status shows "Valid Configuration"
- [ ] Tested `https://zoravo.in` - works! ✅

---

## 🔧 Troubleshooting

**Domain not working?**
- Wait 15-30 minutes for DNS propagation
- Check DNS records are correct
- Verify domain status in Vercel dashboard

**Need detailed instructions?**
- See `Setup/VERCEL_DOMAIN_SETUP.md` for complete guide

---

**Ready to go!** 🎉

