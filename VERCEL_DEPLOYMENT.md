# Vercel Deployment Guide for Zoravo OMS

This guide will help you deploy Zoravo OMS to Vercel successfully.

## Prerequisites

1. A Vercel account ([vercel.com](https://vercel.com))
2. A Supabase project with database schema set up
3. All environment variables ready

## Step 1: Prepare Your Repository

1. Ensure all code is committed and pushed to your Git repository (GitHub, GitLab, or Bitbucket)
2. Verify that `.env.local` is in `.gitignore` (it should be)

## Step 2: Set Up Supabase

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Run Database Migrations**: Execute all SQL files from the `database/` folder in your Supabase SQL Editor:
   - `schema.sql` (main schema)
   - `multi_tenant_schema.sql` (multi-tenant setup)
   - `setup_user_roles.sql` (user roles)
   - Any other migration files as needed

3. **Create Storage Buckets**:
   - Go to Storage in Supabase Dashboard
   - Create a bucket named `payment-proofs` (public or with RLS policies)
   - Create any other buckets your application needs

4. **Get Your Supabase Credentials**:
   - Go to Project Settings → API
   - Copy your `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
   - Copy your `anon` `public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Copy your `service_role` `secret` key (SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

## Step 4: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

### Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Optional Environment Variables

```env
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=social@sunkool.in
```

### Important Notes:

- **NEXT_PUBLIC_*** variables are exposed to the browser - only use safe, public keys
- **SUPABASE_SERVICE_ROLE_KEY** is server-only and should NEVER be exposed to the client
- Add these variables for **Production**, **Preview**, and **Development** environments
- After adding variables, **redeploy** your application

## Step 5: Configure Vercel Project Settings

### Build Settings

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Node.js Version

Vercel will auto-detect, but you can specify in `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Step 6: Domain Configuration (Optional)

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Subdomain Workspace Support

The application supports workspace detection via subdomains:
- `workspace-name.your-domain.com` → Detects workspace automatically
- `workspace-name.your-project.vercel.app` → Works on Vercel preview URLs

## Step 7: Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication (login/logout)
- [ ] Test database connections
- [ ] Test file uploads (payment proofs, attachments)
- [ ] Test API routes
- [ ] Verify Supabase storage buckets are accessible
- [ ] Test multi-tenant workspace detection
- [ ] Check error logs in Vercel Dashboard

## Step 8: Create First Super Admin

After deployment, you need to create a super admin user. You can:

1. **Use the setup script** (if available):
   ```bash
   npm run setup-super-admin
   ```

2. **Or manually create via Supabase Dashboard**:
   - Go to Authentication → Users
   - Create a new user
   - Add them to `super_admins` table in Database

## Troubleshooting

### Build Failures

- Check Vercel build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify TypeScript/ESLint errors (they're ignored during build but check logs)

### Runtime Errors

- Check Vercel Function logs
- Verify environment variables are set correctly
- Check Supabase connection and RLS policies

### Image Loading Issues

- Verify Supabase storage buckets are public or have proper RLS policies
- Check `next.config.js` has correct `remotePatterns` for Supabase domains

### Authentication Issues

- Verify Supabase URL and keys are correct
- Check Supabase Auth settings
- Verify RLS policies are set up correctly

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key | `eyJhbGc...` |
| `RESEND_API_KEY` | No | Resend API key for emails | `re_xxx...` |
| `RESEND_FROM_EMAIL` | No | Default from email address | `social@sunkool.in` |

## Support

For issues or questions:
- Check Vercel logs: Dashboard → Your Project → Logs
- Check Supabase logs: Dashboard → Logs
- Review application logs in browser console

## Next Steps After Deployment

1. Set up custom domain (if needed)
2. Configure email service (Resend)
3. Set up monitoring and error tracking
4. Configure backup strategies for Supabase
5. Set up CI/CD for automatic deployments

