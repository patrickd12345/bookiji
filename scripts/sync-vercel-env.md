# Sync Environment Variables to Vercel Production

## Critical Supabase Variables (Required for Authentication)

Copy these from your `.env.local` to **Vercel Dashboard → Settings → Environment Variables**:

### Required Variables for Production:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI1ODU5NiwiZXhwIjoyMDgxODM0NTk2fQ.ZqDpwTzkGbirFxrCXWP5FNE0ehNWkasa7AM6BnwVXkw
```

### Additional Important Variables:

```bash
# App URL (update for production)
NEXT_PUBLIC_APP_URL=https://bookiji.com
NEXT_PUBLIC_BASE_URL=https://bookiji.com
CANONICAL_HOST=bookiji.com

# Database
DATABASE_URL=postgresql://postgres:Bookiji2024!@db.uradoazoyhhozbemrccj.supabase.co:5432/postgres

# Stripe (if using payments)
STRIPE_SECRET_KEY=[your_live_stripe_key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your_live_stripe_key]
STRIPE_WEBHOOK_SECRET=[your_webhook_secret]

# Mapbox (if using maps)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=[your_mapbox_token]
NEXT_PUBLIC_MAPBOX_TOKEN=[your_mapbox_token]

# AI/LLM
SUPPORT_LLM_PROVIDER=groq
GROQ_API_KEY=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
SUPPORT_EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyCRZ_QGmKpeZI1cdWMh3fR_vHI4Xvdfx5c

# SEO
INDEXNOW_KEY=6e58c0fca47b66297cec27a6d0c200e2

# KB API
API_BASE_URL=https://api.bookiji.com
KB_API_KEY=b5adf5c6edb883932104c96c7a9969cc4c5142f732a7ebd41520c9736a7323fa
KB_RATE_LIMIT_PER_MIN=30

# MailerSend
MAILERSEND_SMTP_HOST=smtp.mailersend.net
MAILERSEND_SMTP_PORT=587
MAILERSEND_SMTP_USER=MS_0hxbtC@bookiji.com
MAILERSEND_SMTP_PASS=mssp.sLKhPTo.vywj2lp077147oqz.k9nsVIT
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
# Paste: https://uradoazoyhhozbemrccj.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
# Paste: sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz

vercel env add SUPABASE_SECRET_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI1ODU5NiwiZXhwIjoyMDgxODM0NTk2fQ.ZqDpwTzkGbirFxrCXWP5FNE0ehNWkasa7AM6BnwVXkw
```

Then redeploy:
```bash
vercel --prod
```

