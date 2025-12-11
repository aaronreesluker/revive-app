# Troubleshooting "Failed to Fetch" Login Error

If you're seeing "failed to fetch" when trying to log in, follow these steps:

## Step 1: Check Your Environment Variables in Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Verify you have these 4 variables (exact names, case-sensitive):
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `NEXT_PUBLIC_APP_URL`

3. **Check the values:**
   - ⚠️ **CRITICAL:** `NEXT_PUBLIC_SUPABASE_URL` should look like: `https://xxxxx.supabase.co`
     - **NOT** `https://supabase.com/dashboard/...` (that's the dashboard URL, not the API URL!)
     - **NOT** `https://app.supabase.com/...` (that's also wrong)
     - It MUST be your project's unique API URL: `https://<your-project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be a long string starting with `eyJ...`
   - Make sure there are **no extra spaces** before or after the values

4. **Check the environment checkboxes:**
   - Each variable should have all 3 checked:
     - ☑ Production
     - ☑ Preview
     - ☑ Development

## Step 2: Verify Your Supabase Project is Active

1. Go to [https://supabase.com](https://supabase.com)
2. Log in and open your project
3. Check the project status - it should be **"Active"** (not paused)
4. If paused, click "Resume" to activate it

## Step 3: Test Your Supabase Connection

1. In Supabase, go to **Settings** → **API**
2. Copy your **Project URL** and **anon key**
3. Open your browser's Developer Console (F12)
4. Go to your Vercel app URL
5. In the Console tab, paste this and press Enter:

```javascript
fetch('YOUR_SUPABASE_URL/rest/v1/', {
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
}).then(r => r.json()).then(console.log).catch(console.error)
```

Replace:
- `YOUR_SUPABASE_URL` with your actual Supabase URL
- `YOUR_ANON_KEY` with your actual anon key

**Expected result:** You should see a response (even if it's an error about tables, that's OK - it means the connection works)

**If you see "Failed to fetch":**
- Your Supabase URL might be wrong
- Your Supabase project might be paused
- There might be a network/firewall issue

## Step 4: Check Browser Console for Specific Errors

1. Open your app in the browser
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Try to log in
5. Look for any red error messages

**Common errors and fixes:**

### Error: "Invalid API key"
- Your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is wrong
- Go back to Supabase → Settings → API and copy the **anon** key again

### Error: "Invalid URL"
- Your `NEXT_PUBLIC_SUPABASE_URL` is wrong
- Make sure it starts with `https://` and ends with `.supabase.co`
- No trailing slash at the end

### Error: "Network request failed"
- Your Supabase project might be paused
- Check Supabase dashboard → Project status

### Error: "relation 'profiles' does not exist"
- You haven't run the database schema yet
- Go to **Step 5** below

## Step 5: Make Sure Database Schema is Set Up

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from your project
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

**Important:** If you see errors about tables already existing, that's OK - it means the schema was already run.

## Step 6: Redeploy After Changes

**After adding/changing environment variables:**
1. Go to Vercel → **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes for it to finish

**Environment variables only take effect after redeploy!**

## Step 7: Verify Your User Exists

1. In Supabase, go to **Authentication** → **Users**
2. Check if your user account exists
3. If not, you need to create it first (see below)

## Step 8: Create Your First Admin Account

If you don't have a user account yet:

### Option A: Use the Setup API (Easiest)

1. Go to your Vercel app URL: `https://your-app.vercel.app/api/setup-admin`
2. Open browser DevTools (F12) → **Console** tab
3. Paste this and press Enter:

```javascript
fetch('/api/setup-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'YourSecurePassword123!' })
}).then(r => r.json()).then(console.log)
```

4. Replace `YourSecurePassword123!` with your desired password
5. You should see a success message with your email and password

### Option B: Create via Supabase Dashboard

1. In Supabase, go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - Email: `your-email@example.com`
   - Password: (choose a secure password)
4. Click **"Create user"**
5. Go to **Table Editor** → **profiles**
6. Find your user (by email) and set:
   - `role` = `admin`
   - `name` = Your name
   - `tenant_id` = `default-tenant`

## Step 9: Check Vercel Build Logs

1. Go to Vercel → **Deployments**
2. Click on your latest deployment
3. Check the **"Build Logs"** tab
4. Look for any errors about environment variables

**Common build errors:**
- "Environment variable not found" → You forgot to add it
- "Invalid URL" → Check your Supabase URL format

## Quick Checklist

- [ ] All 4 environment variables added to Vercel
- [ ] All 3 environment checkboxes checked for each variable
- [ ] No extra spaces in variable values
- [ ] Supabase project is active (not paused)
- [ ] Database schema (`supabase-schema.sql`) has been run
- [ ] Redeployed after adding environment variables
- [ ] User account exists in Supabase Authentication
- [ ] User has a profile with `role = admin`
- [ ] Browser console shows no connection errors

## Still Not Working?

1. **Double-check your Supabase URL:**
   - Should be: `https://xxxxxxxxxxxxx.supabase.co`
   - NOT: `https://xxxxxxxxxxxxx.supabase.co/` (no trailing slash)

2. **Double-check your API keys:**
   - Copy them fresh from Supabase → Settings → API
   - Make sure you're copying the **anon** key (not service_role) for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Try a hard refresh:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - This clears cached JavaScript

4. **Check Vercel deployment status:**
   - Make sure your latest deployment is "Ready" (green checkmark)
   - If it's still building, wait for it to finish

5. **Test in incognito mode:**
   - Open a new incognito/private window
   - Try logging in there
   - This rules out browser cache issues

If none of this works, check the browser console (F12) for the exact error message and share it for further help.
