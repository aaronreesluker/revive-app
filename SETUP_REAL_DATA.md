# Setting Up Real Data in Production

This guide will help you connect your deployed Vercel app to a real Supabase database.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Project name**: `revive-production` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it** (you'll need it)
   - **Region**: Choose closest to your users
4. Wait ~2 minutes for project creation

## Step 2: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open the file `supabase-schema.sql` from this project
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see "Success" messages - this creates all tables, indexes, and security policies

## Step 3: Get Your Supabase API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) - **Keep this secret!**

## Step 4: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables (for **Production**, **Preview**, and **Development**):

### Required Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important:**
- Replace `your-project.supabase.co` with your actual Supabase project URL
- Replace `your-app.vercel.app` with your actual Vercel deployment URL
- Make sure to set these for **all environments** (Production, Preview, Development)

### Optional Variables (for full functionality):

```bash
# Go High Level (for email notifications)
REVIVE_GHL_API_KEY=ghl_live_xxxxx
REVIVE_GHL_LOCATION_ID=your_location_id
REVIVE_GHL_BASE_URL=https://services.leadconnectorhq.com

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

## Step 5: Redeploy on Vercel

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on your latest deployment
3. Click **"Redeploy"**
4. Wait for the build to complete

## Step 6: Create Your First Admin Account

1. Go to your deployed app URL
2. Click **"Create Account"** on the login page
3. Sign up with your email
4. **Verify your email** (check your inbox for Supabase verification email)
5. After logging in, you need to make yourself an admin:
   - Go to Supabase dashboard → **Table Editor** → **profiles**
   - Find your user (by email)
   - Edit the `role` field and change it from `sales` to `admin`
   - Save

**Alternative:** Use the setup-admin API endpoint:
```
POST https://your-app.vercel.app/api/setup-admin
Body: {
  "email": "your-email@example.com",
  "password": "your-password",
  "name": "Your Name"
}
```

## Step 7: Verify It's Working

1. Log in to your app
2. Go to **Settings** → **Team Members**
3. You should see your user listed
4. Try creating a contact - it should save to Supabase
5. Check Supabase **Table Editor** → **contacts** to verify data is being saved

## Troubleshooting

### App still shows demo mode
- Check that environment variables are set correctly in Vercel
- Make sure you redeployed after adding variables
- Check Vercel build logs for any errors

### Can't log in / Authentication errors
- Verify your email in Supabase (check **Authentication** → **Users**)
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check browser console for errors

### Data not saving
- Check Supabase **Table Editor** to see if tables exist
- Verify RLS policies are enabled (they should be from the schema)
- Check Vercel function logs for API errors

### Permission denied errors
- Make sure you ran the full `supabase-schema.sql` file
- Check that RLS policies were created (in Supabase **Authentication** → **Policies**)

## What Happens Now?

Once configured:
- ✅ All data saves to Supabase PostgreSQL database
- ✅ Authentication uses Supabase Auth
- ✅ Data persists across devices
- ✅ Multiple users can access the same data
- ✅ Admin features work (user management, signup approval, etc.)

Your app is now using **real production data** instead of demo mode!
