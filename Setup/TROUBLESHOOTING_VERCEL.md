# Vercel Deployment Troubleshooting Guide

## Common Deployment Errors and Solutions

### 1. Build Failures

#### Error: "Module not found" or "Cannot find module"
**Solution:**
- Ensure all dependencies are in `package.json`
- Run `npm install` locally to verify all packages install correctly
- Check that `node_modules` is in `.gitignore` (it should be)
- Delete `package-lock.json` and `node_modules`, then run `npm install` again

#### Error: "TypeScript errors" or "ESLint errors"
**Solution:**
- These are currently ignored in `next.config.js`, but check the build logs
- Fix any critical TypeScript errors locally first
- Run `npm run build` locally to catch errors before deploying

#### Error: "Environment variable not found"
**Solution:**
- Ensure all required environment variables are set in Vercel Dashboard:
  - Go to Project Settings → Environment Variables
  - Add for Production, Preview, and Development environments
  - Required variables:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
- After adding variables, **redeploy** the application

### 2. Runtime Errors

#### Error: "Missing Supabase environment variables"
**Solution:**
- Verify environment variables are set correctly in Vercel
- Check that variable names match exactly (case-sensitive)
- Ensure no extra spaces or quotes in variable values
- Redeploy after adding/updating variables

#### Error: "Failed to fetch" or API route errors
**Solution:**
- Check Vercel Function logs in Dashboard → Logs
- Verify Supabase connection is working
- Check RLS policies in Supabase
- Ensure API routes are properly handling errors

### 3. Next.js 15 Specific Issues

#### Error: "React Server Components" or "use client" issues
**Solution:**
- Ensure all client components have `'use client'` directive
- Check that server components don't use browser-only APIs
- Verify imports are correct for Next.js 15

#### Error: "Middleware" errors
**Solution:**
- Check `middleware.ts` is in the root directory
- Verify middleware exports are correct
- Ensure middleware doesn't cause infinite redirects

### 4. Build Timeout

**Solution:**
- Increase build timeout in Vercel settings (if on Pro plan)
- Optimize build by:
  - Removing unused dependencies
  - Checking for large files in the repository
  - Ensuring `.gitignore` excludes unnecessary files

### 5. Deployment Hangs or Fails Silently

**Solution:**
- Check Vercel build logs for specific errors
- Verify Git repository is properly connected
- Ensure build command is correct: `npm run build`
- Check that Node.js version is compatible (>=18.0.0)

## Step-by-Step Debugging Process

### Step 1: Check Build Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the failed deployment
3. Review the build logs for specific error messages
4. Look for:
   - Missing dependencies
   - TypeScript/ESLint errors
   - Environment variable issues
   - Import/module errors

### Step 2: Test Build Locally
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Test build
npm run build

# If build succeeds locally but fails on Vercel:
# - Check environment variables
# - Verify Node.js version compatibility
# - Check for platform-specific issues
```

### Step 3: Verify Environment Variables
```bash
# Check which variables are needed
grep -r "process.env" lib/ app/ --include="*.ts" --include="*.tsx"

# Required variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - RESEND_API_KEY (optional)
# - RESEND_FROM_EMAIL (optional)
```

### Step 4: Check Vercel Configuration
1. Go to Project Settings → General
2. Verify:
   - Framework: Next.js (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next` (default)
   - Install Command: `npm install`
   - Node.js Version: 18.x or 20.x

### Step 5: Review Code for Common Issues
- [ ] All imports are correct
- [ ] No hardcoded localhost URLs
- [ ] Environment variables use correct prefixes (`NEXT_PUBLIC_*` for client-side)
- [ ] No browser-only code in server components
- [ ] Middleware is properly configured

## Quick Fixes

### Fix 1: Update next.config.js for Better Compatibility
The current config should work, but if you're having issues, try:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/ssr'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  // Ensure proper output
  output: 'standalone', // Optional: for better optimization
}

module.exports = nextConfig
```

### Fix 2: Ensure Proper .gitignore
Your `.gitignore` should include:
```
node_modules
.next
.env*.local
*.log
.DS_Store
```

### Fix 3: Verify package.json Scripts
Ensure these scripts exist:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

## Getting Help

If you're still experiencing issues:

1. **Share the specific error message** from Vercel build logs
2. **Check Vercel Status**: https://www.vercel-status.com/
3. **Review Next.js 15 Docs**: https://nextjs.org/docs
4. **Check Supabase Status**: https://status.supabase.com/

## Common Error Messages Reference

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "Module not found" | Missing dependency | Add to package.json and redeploy |
| "Environment variable undefined" | Missing env var | Add in Vercel Dashboard |
| "Build timeout" | Build taking too long | Optimize build or upgrade plan |
| "Type error" | TypeScript issue | Fix locally, then redeploy |
| "Cannot read property" | Runtime error | Check Vercel Function logs |
| "Failed to fetch" | API/Network issue | Check Supabase connection |

## Next Steps After Fixing

Once deployment succeeds:
1. Test the deployed application
2. Verify all environment variables work
3. Test authentication flow
4. Check API routes
5. Verify file uploads work
6. Test multi-tenant workspace detection

