# Quick Fix Guide for Vercel Deployment

## Most Common Issues & Quick Fixes

### ❌ Issue 1: "Environment Variable Not Found"
**Quick Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables (for Production, Preview, and Development):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click "Redeploy" after adding variables

### ❌ Issue 2: "Module Not Found" or Build Fails
**Quick Fix:**
```bash
# Test build locally first
npm install
npm run build

# If it works locally but fails on Vercel:
# 1. Check that all dependencies are in package.json
# 2. Ensure node_modules is in .gitignore
# 3. Commit and push package.json and package-lock.json
```

### ❌ Issue 3: "TypeScript/ESLint Errors"
**Quick Fix:**
- These are already ignored in `next.config.js`
- But check build logs for critical errors
- Fix any errors locally, then redeploy

### ❌ Issue 4: Build Timeout
**Quick Fix:**
- Check for large files in repository
- Ensure `.gitignore` excludes unnecessary files
- Remove any large dependencies if possible

### ❌ Issue 5: "Failed to Fetch" or Runtime Errors
**Quick Fix:**
1. Check Vercel Function Logs: Dashboard → Logs
2. Verify Supabase connection:
   - Check Supabase project is active
   - Verify RLS policies are set
   - Test Supabase connection from local environment

## Pre-Deployment Checklist

Before deploying, run these commands locally:

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Test build
npm run build

# 3. If build succeeds, commit and push
git add .
git commit -m "Fix deployment issues"
git push
```

## Environment Variables Checklist

✅ All variables added in Vercel Dashboard:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY` (optional)
- [ ] `RESEND_FROM_EMAIL` (optional)

✅ Variables set for all environments:
- [ ] Production
- [ ] Preview
- [ ] Development

## Still Having Issues?

1. **Check the specific error** in Vercel build logs
2. **Share the error message** - it helps identify the exact issue
3. **Review** `TROUBLESHOOTING_VERCEL.md` for detailed solutions

## Common Error Patterns

| Error Contains | Solution |
|---------------|----------|
| "Cannot find module" | Add missing dependency to package.json |
| "process.env is undefined" | Add environment variable in Vercel |
| "Build timeout" | Optimize build or check for large files |
| "Type error" | Fix TypeScript errors locally |
| "Failed to fetch" | Check Supabase connection and RLS |

