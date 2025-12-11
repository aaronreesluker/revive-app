# Deployment Guide

This guide will help you deploy your Revive Console application to production.

## Quick Deploy to Vercel (Recommended)

Vercel is the easiest and most common platform for deploying Next.js applications.

### Step 1: Prepare Your Repository

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub/GitLab/Bitbucket account

2. **Import Your Project**
   - Click "Add New Project"
   - Import your repository
   - Vercel will auto-detect Next.js

3. **Configure Build Settings**
   - **Root Directory**: `revive-app` (if your project is in a subdirectory)
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (or `pnpm build` if using pnpm)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (or `pnpm install`)

### Step 3: Set Environment Variables

In Vercel project settings → Environment Variables, add:

#### Required Variables:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App URL (Required - update after first deploy)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### Optional Variables (for full functionality):

```bash
# Go High Level (for email notifications)
REVIVE_GHL_API_KEY=your_ghl_api_key
REVIVE_GHL_LOCATION_ID=your_location_id
REVIVE_GHL_BASE_URL=https://services.leadconnectorhq.com
REVIVE_GHL_SANDBOX=false

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Stripe Connect (optional, for multi-tenant payments)
STRIPE_CONNECT_CLIENT_ID=ca_...
```

**Important Notes:**
- Set these for **Production**, **Preview**, and **Development** environments
- After first deploy, update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
- Never commit `.env.local` to git (it should be in `.gitignore`)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (usually 2-5 minutes)
3. Your app will be live at `https://your-project.vercel.app`

### Step 5: Update URLs

After deployment:

1. **Update `NEXT_PUBLIC_APP_URL`** in Vercel environment variables with your actual domain
2. **Update Supabase Auth Settings**:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL to "Site URL" and "Redirect URLs"
   - Example: `https://your-app.vercel.app`

3. **Update Stripe Webhook** (if using Stripe):
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Copy the webhook secret to `STRIPE_WEBHOOK_SECRET` in Vercel

## Alternative Deployment Options

### Netlify

1. Connect your Git repository
2. Build command: `cd revive-app && npm run build`
3. Publish directory: `revive-app/.next`
4. Add environment variables in Site settings

### Railway

1. Connect your Git repository
2. Set build command: `cd revive-app && npm install && npm run build`
3. Set start command: `cd revive-app && npm start`
4. Add environment variables in project settings

### Self-Hosted (VPS/Docker)

1. Build the Docker image:
   ```bash
   cd revive-app
   docker build -t revive-app .
   ```

2. Run with environment variables:
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=... \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
     -e SUPABASE_SERVICE_ROLE_KEY=... \
     revive-app
   ```

## Post-Deployment Checklist

- [ ] Test login/signup flow
- [ ] Verify admin account creation works
- [ ] Test email notifications (if GHL configured)
- [ ] Test Stripe payments (if configured)
- [ ] Verify all API routes work
- [ ] Check that environment variables are set correctly
- [ ] Set up custom domain (optional)
- [ ] Enable SSL/HTTPS (automatic on Vercel)

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version (Next.js 16 requires Node 18+)
- Check build logs in Vercel dashboard

### Environment Variables Not Working
- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Ensure RLS policies allow access

### Authentication Not Working
- Verify Supabase Auth URLs are configured correctly
- Check redirect URLs include your production domain
- Ensure cookies are enabled in browser

## Support

If you encounter issues:
1. Check Vercel build logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test API routes individually
