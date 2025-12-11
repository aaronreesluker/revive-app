# How to Check if Aaron's Account Exists in Supabase

## Step 1: Check Authentication Users

1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Click on your project
4. In the left sidebar, click **"Authentication"**
5. Click **"Users"** (or it might already be selected)
6. Look for `aaron@revivemarketing.uk` in the list

**What you'll see:**
- ✅ **If the user exists:** You'll see the email address listed with a creation date
- ❌ **If the user doesn't exist:** The list will be empty or won't have that email

---

## Step 2: Check the Profiles Table

1. Still in Supabase, click **"Table Editor"** in the left sidebar
2. Click on the **"profiles"** table
3. Look for a row where `email = aaron@revivemarketing.uk`

**What to check:**
- Does the row exist?
- What is the `role` field set to? (should be `admin`)
- What is the `name` field? (should be "Aaron" or similar)

---

## Step 3: If Account Exists - Reset Password

If you found the account but don't remember the password:

### Option A: Reset via Supabase Dashboard

**⚠️ IMPORTANT:** Before requesting a password reset, make sure Supabase redirect URLs are configured correctly (see `FIX_SUPABASE_REDIRECT_URLS.md`)

1. Go to **Authentication** → **Users**
2. Find `aaron@revivemarketing.uk`
3. Click on the user (or the three dots menu)
4. Click **"Reset Password"** or **"Send Password Reset Email"**
5. Check your email for the reset link
6. **If the link tries to go to localhost:3000**, you need to update Supabase redirect URLs first

### Option B: Update Password Directly
1. Go to **Authentication** → **Users**
2. Find `aaron@revivemarketing.uk`
3. Click on the user
4. Look for **"Update User"** or **"Edit"** button
5. You can set a new password directly here

---

## Step 4: If Account Doesn't Exist - Create It

If the account doesn't exist, create it using the setup API:

1. Go to your Vercel app: `https://revive-app-five.vercel.app/api/setup-admin`
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
5. You should see a success message

---

## Quick Summary

**Aaron's Login Info:**
- **Email:** `aaron@revivemarketing.uk`
- **Password:** (whatever you set when creating the account, or reset it using the steps above)

**To Log In:**
1. Go to your Vercel app: `https://revive-app-five.vercel.app/login`
2. Enter email: `aaron@revivemarketing.uk`
3. Enter your password
4. Click "Sign In"
