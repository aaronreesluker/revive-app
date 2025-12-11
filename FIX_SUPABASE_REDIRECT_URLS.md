# Fix Supabase Redirect URLs

The password reset link is trying to redirect to `localhost:3000` instead of your Vercel production URL. Here's how to fix it:

## Step 1: Update Supabase Site URL

1. Go to [https://supabase.com](https://supabase.com)
2. Log in and open your project
3. Click **"Settings"** (gear icon at the bottom)
4. Click **"Authentication"** in the settings menu
5. Scroll down to **"URL Configuration"** section

## Step 2: Update the Site URL

1. Find the **"Site URL"** field
2. Change it from `http://localhost:3000` (or whatever it is) to:
   ```
   https://revive-app-five.vercel.app
   ```
3. Click **"Save"**

## Step 3: Add Redirect URLs

1. Still in **Authentication** → **URL Configuration**
2. Find the **"Redirect URLs"** section
3. Click **"Add URL"** or edit the existing list
4. Make sure these URLs are in the list:
   ```
   https://revive-app-five.vercel.app/**
   https://revive-app-five.vercel.app/auth/callback
   http://localhost:3000/** (if you want to test locally)
   ```
5. Click **"Save"**

## Step 4: Request a New Password Reset

Now that the URLs are fixed:

1. Go to **Authentication** → **Users**
2. Find `aaron@revivemarketing.uk`
3. Click on the user
4. Click **"Send Password Reset Email"** or **"Reset Password"**
5. Check your email for the new reset link
6. Click the link - it should now redirect to your Vercel app instead of localhost

## Alternative: Set Password Directly (Faster)

If you want to skip the email reset:

1. Go to **Authentication** → **Users**
2. Find `aaron@revivemarketing.uk`
3. Click on the user
4. Look for **"Update User"** or **"Edit"** button
5. Find the password field
6. Enter your new password
7. Click **"Save"** or **"Update"**

Then you can log in directly at: `https://revive-app-five.vercel.app/login`

---

## Quick Summary

**The Problem:**
- Supabase was configured to redirect to `localhost:3000`
- Your production app is on Vercel, not localhost

**The Fix:**
- Update Supabase Site URL to: `https://revive-app-five.vercel.app`
- Add redirect URLs for your Vercel domain
- Request a new password reset email (or set password directly)
