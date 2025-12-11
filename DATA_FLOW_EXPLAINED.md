# How Data Flows Between Your App and Supabase

## ✅ Yes, Data You Add in the App Goes to Supabase!

Since you're logged in with your Supabase account, **everything you do in the app saves directly to Supabase**.

---

## How It Works

### When You Add New Data (Create)

1. **You create a contact/lead/invoice in the app**
2. **App saves it to Supabase** using `.insert()`
3. **Data appears in both places:**
   - ✅ In your app (immediately)
   - ✅ In Supabase Table Editor (immediately)

**Example:** When you add a contact:
```javascript
// App code automatically does this:
supabase.from("contacts").insert({
  name: "John Doe",
  email: "john@example.com",
  tenant_id: "your-tenant-id"
})
```

### When You Edit Data (Update)

1. **You edit a contact/lead in the app**
2. **App updates it in Supabase** using `.update()`
3. **Changes are saved immediately**

### When You Delete Data

1. **You delete something in the app**
2. **App deletes it from Supabase** using `.delete()`
3. **It's gone from both places**

---

## Data Loading

### When You Open the App

1. **App loads existing data from Supabase**
2. **You see all your data** (including what was already in Supabase)
3. **New data you add gets mixed with existing data**

**Important:** The app shows **ALL data** from Supabase that matches your `tenant_id`. So:
- ✅ Existing data in Supabase → Shows in app
- ✅ New data you add in app → Saves to Supabase
- ✅ Everything stays in sync!

---

## What About Metrics Like Revenue and Lead Quantity?

### These Are **Calculated**, Not Stored

Metrics like:
- **Total Revenue** - Calculated from closed leads (`priceSoldAt` + `upsellAmount`)
- **Lead Quantity** - Count of all leads in `sales_leads` table
- **Close Rate** - Calculated as (closed leads / total leads) × 100
- **Average Sale Price** - Calculated from closed leads

**How it works:**
1. **The app reads all your leads from Supabase**
2. **It calculates metrics on-the-fly** (in real-time)
3. **No separate "metrics" table** - it's all calculated from your actual data

**Example:**
```javascript
// When you view the dashboard, the app does this:
const closedLeads = leads.filter(l => l.status === "Closed");
const totalRevenue = closedLeads.reduce((sum, l) => 
  sum + (l.priceSoldAt || 0) + (l.upsellAmount || 0), 0
);
```

**So:**
- ✅ Add a lead → It's saved to Supabase → Revenue/metrics update automatically
- ✅ Close a lead → Update saved to Supabase → Revenue/metrics recalculate
- ✅ Everything is always up-to-date!

---

## What About Existing Data in Supabase?

If you already have data in Supabase:

1. **It will automatically appear in your app** when you log in
2. **You can edit it** in the app, and changes save back to Supabase
3. **You can add new data** in the app, and it gets added to Supabase
4. **Everything stays synchronized**

---

## Data Isolation (Tenant ID)

Your data is isolated by `tenant_id`:
- Each user/team has a `tenant_id` (like "default-tenant")
- The app only shows data for **YOUR** `tenant_id`
- Other users with different `tenant_id` won't see your data

**This means:**
- ✅ Your existing data in Supabase (with your `tenant_id`) → Shows in app
- ✅ New data you add → Gets your `tenant_id` automatically
- ✅ Everything is properly isolated

---

## What Data Gets Saved?

### ✅ Saved to Supabase (Permanent Storage):

1. **Contacts** → `contacts` table
2. **Sales Leads** → `sales_leads` table
   - Includes: business name, price, status, closed date, revenue, etc.
3. **Invoices** → `invoices` table
4. **Reviews** → `reviews` table
5. **Workflows** → `workflows` table
6. **Activity Log** → `activity_log` table

### 📊 Calculated On-the-Fly (Not Stored):

1. **Total Revenue** - Sum of closed leads
2. **Lead Count** - Count of leads
3. **Close Rate** - Percentage calculation
4. **Average Sale Price** - Calculated from closed leads
5. **Industry Metrics** - Calculated from leads grouped by industry
6. **Dashboard Stats** - All calculated from your actual data

---

## Example Flow

### Scenario: You Add a New Lead

1. **You fill out the form** in the app (business name, price, etc.)
2. **You click "Save"**
3. **App saves to Supabase:**
   ```sql
   INSERT INTO sales_leads (business_name, current_price, status, tenant_id, ...)
   VALUES ('ABC Company', 5000, 'Not Interested', 'default-tenant', ...)
   ```
4. **Data appears in:**
   - ✅ Your app (immediately)
   - ✅ Supabase Table Editor → `sales_leads` table
5. **Dashboard metrics update automatically:**
   - Lead count increases
   - Revenue stays the same (until you close it)

### Scenario: You Close a Lead

1. **You change status to "Closed"** and enter sale price
2. **App updates in Supabase:**
   ```sql
   UPDATE sales_leads 
   SET status = 'Closed', price_sold_at = 5000, closed_date = NOW()
   WHERE id = 'lead-id'
   ```
3. **Dashboard metrics update:**
   - Revenue increases by £5,000
   - Close rate increases
   - Average sale price updates

---

## Quick Summary

| Question | Answer |
|----------|--------|
| **Does data I add save to Supabase?** | ✅ Yes, immediately |
| **Does existing Supabase data show in app?** | ✅ Yes, automatically |
| **Are metrics like revenue stored?** | ❌ No, calculated on-the-fly |
| **Will my existing data work?** | ✅ Yes, if it has the right `tenant_id` |
| **Is data bidirectional?** | ✅ Yes, app ↔ Supabase |

---

## Important Notes

1. **Make sure your existing data has `tenant_id`** - The app filters by this, so data without it won't show
2. **All calculations are real-time** - Metrics update as soon as you add/edit data
3. **No data duplication** - Everything is stored once in Supabase
4. **Multi-user support** - Each user/team has their own `tenant_id` for data isolation

---

## Troubleshooting

### "I don't see my existing Supabase data"
- Check that your data has the correct `tenant_id` (match it to your user's `tenant_id`)
- Check that you're logged in with the right account
- Verify the data exists in Supabase Table Editor

### "Metrics seem wrong"
- Metrics are calculated from your actual data
- Check that leads have correct `status` (should be "Closed" for revenue)
- Check that `price_sold_at` and `upsell_amount` are set correctly

### "Data isn't saving"
- Check browser console (F12) for errors
- Verify environment variables are set in Vercel
- Make sure you're not in demo mode

---

**Bottom line:** Everything you do in the app saves to Supabase, and all metrics are calculated from that real data in real-time! 🎉
