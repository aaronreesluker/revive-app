# Environment Variables Reference

Copy this list when setting up your production environment.

## Required Variables

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application URL (REQUIRED - update after first deploy)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Optional Variables (for full functionality)

```bash
# Go High Level Integration (for email notifications)
REVIVE_GHL_API_KEY=ghl_live_xxxxx
REVIVE_GHL_LOCATION_ID=your_location_id
REVIVE_GHL_BASE_URL=https://services.leadconnectorhq.com
REVIVE_GHL_SANDBOX=false
REVIVE_GHL_FALLBACK_LOCATION_ID=optional_fallback_id

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Connect (for multi-tenant payments)
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx
```

## Where to Find These Values

### Supabase
1. Go to your Supabase project dashboard
2. **Project Settings** → **API**
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `anon` `public` key
   - `SUPABASE_SERVICE_ROLE_KEY` = `service_role` `secret` key (keep this secret!)

### Go High Level
1. Go to your GHL account
2. **Settings** → **Integrations** → **API**
   - Generate an API key
   - Copy your Location ID

### Stripe
1. Go to Stripe Dashboard
2. **Developers** → **API keys**
   - `STRIPE_SECRET_KEY` = Secret key (starts with `sk_live_` or `sk_test_`)
   - `STRIPE_PUBLISHABLE_KEY` = Publishable key (starts with `pk_live_` or `pk_test_`)
3. **Developers** → **Webhooks**
   - Create webhook endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
4. **Settings** → **Connect** (for Stripe Connect)
   - Copy Client ID to `STRIPE_CONNECT_CLIENT_ID`

## Security Notes

⚠️ **Never commit these to git!**
- `.env.local` should be in `.gitignore`
- Use environment variables in your hosting platform
- Service role keys have full database access - keep them secret!

## Testing Locally

Create a `.env.local` file in the `revive-app` directory:

```bash
# Copy from your production values or use test values
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Then run:
```bash
npm run dev
```
