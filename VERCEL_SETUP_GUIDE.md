# Step-by-Step Guide: Setting Up Real Data on Vercel

This guide shows you exactly where to paste your API keys and configure environment variables.

## Part 1: Get Your Supabase API Keys

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Click on your project (or create a new one if you don't have one)

### Step 2: Find Your API Keys
1. In the left sidebar, click **"Settings"** (gear icon at the bottom)
2. Click **"API"** in the settings menu
3. You'll see a page with your project information

### Step 3: Copy These 3 Values

**Value 1: Project URL**
- Look for **"Project URL"** section (at the top of the API page)
- Copy the URL (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
- ⚠️ **IMPORTANT:** Make sure you copy the **Project URL**, NOT the dashboard URL!
  - ✅ Correct: `https://abcdefghijklmnop.supabase.co`
  - ❌ Wrong: `https://supabase.com/dashboard/project/...`
  - ❌ Wrong: `https://app.supabase.com/project/...`
- **Save this somewhere** - you'll need it in a moment

**Value 2: Anon/Public Key**
- Look for **"Project API keys"** section
- Find the key labeled **"anon"** or **"public"**
- Click the **eye icon** to reveal it (or click "Reveal")
- Copy the entire key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- **Save this somewhere**

**Value 3: Service Role Key**
- Still in the **"Project API keys"** section
- Find the key labeled **"service_role"** (this is the SECRET key)
- Click the **eye icon** to reveal it
- Copy the entire key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- ⚠️ **Keep this secret!** Don't share it publicly

---

## Part 2: Add Environment Variables to Vercel

### Step 1: Open Your Vercel Project
1. Go to [https://vercel.com](https://vercel.com)
2. Log in
3. Click on your **"Revive-app"** project (or whatever you named it)

### Step 2: Go to Environment Variables Settings
1. Click the **"Settings"** tab at the top
2. In the left sidebar, click **"Environment Variables"**

### Step 3: Add Each Variable One by One

You'll add 4 variables. For each one:

1. Click **"Add New"** button
2. Fill in:
   - **Key**: (the variable name)
   - **Value**: (paste your actual value)
   - **Environments**: Check all three boxes:
     - ☑ Production
     - ☑ Preview  
     - ☑ Development
3. Click **"Save"**

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Paste your Supabase Project URL (from Part 1, Value 1)
  - Example: `https://abcdefghijklmnop.supabase.co`
  - ⚠️ **CRITICAL:** Make sure it's the API URL (`https://xxxxx.supabase.co`), NOT the dashboard URL!
- **Environments**: ☑ Production ☑ Preview ☑ Development
- Click **"Save"**

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Paste your anon/public key (from Part 1, Value 2)
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODM5NzYwMCwiZXhwIjoxOTUzOTczNjAwfQ.xxxxxxxxxxxxx`
- **Environments**: ☑ Production ☑ Preview ☑ Development
- Click **"Save"**

#### Variable 3: SUPABASE_SERVICE_ROLE_KEY
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Paste your service_role key (from Part 1, Value 3)
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4Mzk3NjAwLCJleHAiOjE5NTM5NzM2MDB9.xxxxxxxxxxxxx`
- **Environments**: ☑ Production ☑ Preview ☑ Development
- Click **"Save"**

#### Variable 4: NEXT_PUBLIC_APP_URL
- **Key**: `NEXT_PUBLIC_APP_URL`
- **Value**: Your Vercel app URL
  - Find this at the top of your Vercel project page
  - Looks like: `https://revive-app-xxxxx.vercel.app`
  - Or your custom domain if you have one
- **Environments**: ☑ Production ☑ Preview ☑ Development
- Click **"Save"**

### Step 4: Verify All Variables Are Added

You should now see 4 environment variables listed:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NEXT_PUBLIC_APP_URL`

---

## Part 3: Redeploy Your App

After adding environment variables, you need to redeploy:

### Option 1: Automatic Redeploy (Recommended)
1. Go to the **"Deployments"** tab
2. Find your latest deployment
3. Click the **"..."** (three dots) menu on the right
4. Click **"Redeploy"**
5. Wait 1-2 minutes for it to finish

### Option 2: Trigger by Pushing Code
- Just push any small change to GitHub
- Vercel will automatically redeploy

---

## Part 4: Verify It's Working

### Step 1: Check Your App
1. Go to your Vercel app URL (the one you used for `NEXT_PUBLIC_APP_URL`)
2. You should see your app load

### Step 2: Test Login/Create Account
1. Click **"Create Account"** or try to log in
2. If it works, you're connected to Supabase!
3. If you see demo mode or errors, check the troubleshooting section below

### Step 3: Verify Data is Saving
1. Log in to your app
2. Try creating a contact or adding some data
3. Go to Supabase dashboard → **"Table Editor"**
4. Click on the **"contacts"** table (or whatever you created)
5. You should see your data there!

---

## Troubleshooting

### "Still showing demo mode"
- Make sure you added ALL 4 environment variables
- Make sure you checked all 3 environment checkboxes (Production, Preview, Development)
- Make sure you **redeployed** after adding variables
- Check Vercel build logs for errors

### "Can't log in"
- Check Supabase → **Authentication** → **Users** to see if your user exists
- Make sure you verified your email (check your inbox)
- Check browser console (F12) for error messages

### "Environment variables not working"
- Make sure variable names are EXACTLY as shown (case-sensitive)
- Make sure there are no extra spaces when copying
- Try redeploying again

### "Permission denied" errors
- Make sure you ran the `supabase-schema.sql` file in Supabase SQL Editor
- Check that RLS (Row Level Security) policies exist

---

## Visual Guide: Where to Find Things

### In Supabase:
```
Dashboard → Settings (gear icon) → API
├── Project URL (top section)
├── Project API keys
│   ├── anon/public key
│   └── service_role key (secret!)
```

### In Vercel:
```
Your Project → Settings → Environment Variables
├── Add New button
├── Key: NEXT_PUBLIC_SUPABASE_URL
├── Key: NEXT_PUBLIC_SUPABASE_ANON_KEY  
├── Key: SUPABASE_SERVICE_ROLE_KEY
└── Key: NEXT_PUBLIC_APP_URL
```

---

## Quick Checklist

- [ ] Got Supabase Project URL
- [ ] Got Supabase anon key
- [ ] Got Supabase service_role key
- [ ] Added NEXT_PUBLIC_SUPABASE_URL to Vercel
- [ ] Added NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel
- [ ] Added SUPABASE_SERVICE_ROLE_KEY to Vercel
- [ ] Added NEXT_PUBLIC_APP_URL to Vercel
- [ ] Checked all 3 environment boxes for each variable
- [ ] Redeployed on Vercel
- [ ] Tested login/create account
- [ ] Verified data is saving to Supabase

Once all checked, your app is using real data! 🎉
