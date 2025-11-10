# Vercel Deployment Checklist

Use this checklist to ensure your Zoravo OMS deployment is successful.

## Pre-Deployment

- [ ] All code is committed and pushed to Git repository
- [ ] `.env.local` is in `.gitignore` (should not be committed)
- [ ] All dependencies are listed in `package.json`
- [ ] No hardcoded localhost URLs in production code
- [ ] Environment variables are documented in `env.example`

## Supabase Setup

- [ ] Supabase project created
- [ ] Database schema executed (all SQL files from `database/` folder)
- [ ] Storage buckets created:
  - [ ] `payment-proofs` bucket
  - [ ] Any other required buckets
- [ ] RLS policies configured correctly
- [ ] Supabase credentials ready:
  - [ ] Project URL
  - [ ] Anon key
  - [ ] Service role key

## Vercel Configuration

- [ ] Vercel account created
- [ ] Project imported from Git repository
- [ ] Environment variables added in Vercel Dashboard:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `RESEND_API_KEY` (if using email)
  - [ ] `RESEND_FROM_EMAIL` (if using email)
- [ ] Environment variables set for Production, Preview, and Development
- [ ] Build settings verified:
  - [ ] Framework: Next.js
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `.next`
  - [ ] Install Command: `npm install`

## Post-Deployment Testing

- [ ] Application loads without errors
- [ ] Authentication works (login/logout)
- [ ] Database connections successful
- [ ] File uploads work (payment proofs, attachments)
- [ ] API routes respond correctly
- [ ] Images load from Supabase storage
- [ ] Multi-tenant workspace detection works
- [ ] No console errors in browser
- [ ] No errors in Vercel function logs

## First-Time Setup

- [ ] Super admin user created
- [ ] First tenant created (if needed)
- [ ] Test user accounts created
- [ ] Email service configured (if using)

## Monitoring

- [ ] Vercel logs checked for errors
- [ ] Supabase logs checked for errors
- [ ] Error tracking configured (optional)
- [ ] Performance monitoring set up (optional)

## Security

- [ ] Service role key is NOT exposed to client
- [ ] RLS policies are properly configured
- [ ] Environment variables are secure
- [ ] HTTPS is enabled (automatic on Vercel)

## Documentation

- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Team members have access to Vercel dashboard
- [ ] Supabase credentials shared securely with team

## Quick Deploy Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Build fails | Check build logs, verify dependencies |
| Environment variables not working | Redeploy after adding variables |
| Images not loading | Check Supabase storage bucket permissions |
| Authentication fails | Verify Supabase URL and keys |
| Database errors | Check RLS policies and schema |
| API routes fail | Check server function logs in Vercel |

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Project README: See `README.md`
- Deployment Guide: See `VERCEL_DEPLOYMENT.md`

