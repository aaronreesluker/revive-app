# Getting Live Data Working

Since you're logged in, you're already connected to Supabase! Now let's make sure you have data.

## Step 1: Verify You're Using Live Data (Not Demo Mode)

The app automatically uses live data when:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel
- ✅ You're logged in with a Supabase account

**You're already using live data!** If you were in demo mode, you wouldn't be able to log in with your Supabase account.

---

## Step 2: Verify Database Schema is Set Up

1. Go to Supabase → **Table Editor**
2. Check if you see these tables:
   - ✅ `profiles`
   - ✅ `contacts`
   - ✅ `invoices`
   - ✅ `sales_leads`
   - ✅ `reviews`
   - ✅ `workflows`
   - ✅ `activity_log`
   - ✅ `bacs_mandates`
   - ✅ `pending_signups`

**If tables are missing:**
1. Go to **SQL Editor** in Supabase
2. Open `supabase-schema.sql` from your project
3. Copy the entire file
4. Paste into SQL Editor
5. Click **"Run"**

---

## Step 3: Add Some Test Data

### Option A: Add Data Through the App (Recommended)

1. **Add a Contact:**
   - In your app, go to **Contacts** (or wherever contacts are managed)
   - Click **"Add Contact"** or **"New Contact"**
   - Fill in the form and save
   - The data should save to Supabase automatically

2. **Add a Sales Lead:**
   - Go to **Sales Leads** or **Leads**
   - Create a new lead
   - Save it

3. **Verify Data is Saving:**
   - Go to Supabase → **Table Editor** → **contacts** (or **sales_leads**)
   - You should see the data you just created!

### Option B: Add Data Directly in Supabase (For Testing)

1. Go to Supabase → **Table Editor** → **contacts**
2. Click **"Insert row"** or **"New row"**
3. Fill in:
   - `name`: "Test Contact"
   - `email`: "test@example.com"
   - `phone`: "1234567890"
   - `tenant_id`: "default-tenant" (or your tenant ID)
4. Click **"Save"**
5. Refresh your app - you should see the contact!

---

## Step 4: Verify Everything is Working

### Check 1: Data Appears in App
- Open your app
- Navigate to the section where you added data (Contacts, Leads, etc.)
- You should see the data you created

### Check 2: Data is in Supabase
- Go to Supabase → **Table Editor**
- Click on the table (contacts, sales_leads, etc.)
- You should see your data there

### Check 3: Data Persists
- Log out and log back in
- Your data should still be there
- This confirms it's saving to the database, not just localStorage

---

## Step 5: Add More Real Data

Now that it's working, you can:

1. **Import existing data:**
   - If you have CSV files or spreadsheets, you can import them
   - Go to Supabase → **Table Editor** → Click the table → **Import data**

2. **Use the app normally:**
   - Just use the app as you normally would
   - All data will automatically save to Supabase
   - It will persist across devices and sessions

3. **Add team members:**
   - Go to **Settings** → **Team Members**
   - Click **"Add Account"** to create new users
   - They'll be able to see and work with the same data

---

## Troubleshooting

### "I don't see any data"
- Check Supabase → **Table Editor** to see if tables exist
- Make sure you're looking at the right table
- Try adding a new contact/lead through the app

### "Data isn't saving"
- Check browser console (F12) for errors
- Verify environment variables are set in Vercel
- Make sure you redeployed after adding environment variables

### "I see demo data"
- If you see hardcoded demo contacts/leads, that's normal if tables are empty
- Add some real data and it will replace the demo data
- Or check if `NEXT_PUBLIC_USE_DEMO_MODE` is set to `true` in Vercel (it shouldn't be)

### "Permission denied" errors
- Make sure you ran the `supabase-schema.sql` file
- Check that RLS (Row Level Security) policies exist
- Verify your user has the correct `role` in the `profiles` table

---

## Quick Checklist

- [ ] Logged in successfully (✅ You're done with this!)
- [ ] Database tables exist in Supabase
- [ ] Added at least one contact or lead through the app
- [ ] Verified data appears in Supabase Table Editor
- [ ] Data persists after logging out and back in

---

## What's Next?

Once you have live data working:

1. **Add your real contacts/leads** - Import or manually add them
2. **Invite team members** - They can create accounts and access the same data
3. **Set up integrations** (optional):
   - Go High Level API key for email notifications
   - Stripe keys for payment processing
4. **Customize** - Add more features or modify existing ones

**You're all set! Your app is now using live production data! 🎉**
