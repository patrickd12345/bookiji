# Sync Environment Variables to Vercel Production

## ⚠️ SECURITY WARNING
**NEVER commit credentials to version control!**  
This file should only contain variable names and placeholders.  
Copy actual values from your `.env.local` or secure credential storage.

## Critical Supabase Variables (Required for Authentication)

Copy these from your `.env.local` to **Vercel Dashboard → Settings → Environment Variables**:

### Required Variables for Production:

```bash
NEXT_PUBLIC_SUPABASE_URL=[your_supabase_url]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[your_supabase_publishable_key]
SUPABASE_SECRET_KEY=[your_supabase_secret_key]
```

### Additional Important Variables:

```bash
# App URL (update for production)
NEXT_PUBLIC_APP_URL=https://bookiji.com
NEXT_PUBLIC_BASE_URL=https://bookiji.com
CANONICAL_HOST=bookiji.com

# Database
DATABASE_URL=[your_database_url_with_credentials]

# Stripe (if using payments)
STRIPE_SECRET_KEY=[your_live_stripe_key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your_live_stripe_key]
STRIPE_WEBHOOK_SECRET=[your_webhook_secret]

# Mapbox (if using maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=[your_mapbox_token]
NEXT_PUBLIC_MAPBOX_TOKEN=[your_mapbox_token]

# AI/LLM
SUPPORT_LLM_PROVIDER=groq
GROQ_API_KEY=[your_groq_api_key]
SUPPORT_EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=[your_gemini_api_key]

# SEO
INDEXNOW_KEY=[your_indexnow_key]

# KB API
API_BASE_URL=https://api.bookiji.com
KB_API_KEY=[your_kb_api_key]
KB_RATE_LIMIT_PER_MIN=30

# MailerSend
MAILERSEND_SMTP_HOST=smtp.mailersend.net
MAILERSEND_SMTP_PORT=587
MAILERSEND_SMTP_USER=[your_mailersend_smtp_user]
MAILERSEND_SMTP_PASS=[your_mailersend_smtp_password]
MAILERSEND_FROM_EMAIL=no-reply@bookiji.com
MAILERSEND_FROM_NAME=Bookiji
```

## Steps to Fix Production:

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your Bookiji project

2. **Navigate to Environment Variables**
   - Settings → Environment Variables

3. **Add Each Variable**
   - Click "Add New"
   - Paste the variable name and value
   - **IMPORTANT**: Select "Production" (and optionally Preview/Development)
   - Click "Save"

4. **Verify Critical Variables Are Set**
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - ✅ `SUPABASE_SECRET_KEY`

5. **Redeploy**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Select "Redeploy"
   - Or push a commit to trigger new deployment

## Quick Verification:

After redeploying, test:
1. Visit your production site
2. Try to log in
3. Check browser console (F12) for errors
4. The "Unable to connect to authentication server" error should be gone

## Using Vercel CLI (Alternative):

If you have Vercel CLI installed, you can also set them via command line:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste your Supabase URL from .env.local

vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
# Paste your Supabase publishable key from .env.local

vercel env add SUPABASE_SECRET_KEY production
# Paste your Supabase secret key from .env.local
```

Then redeploy:
```bash
vercel --prod
```

