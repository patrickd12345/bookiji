# Production Environment Variables Checklist

## Required Supabase Variables for Production

These must be set in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

### Critical Variables (Must Have)
```
NEXT_PUBLIC_SUPABASE_URL=https://uradoazoyhhozbemrccj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI1ODU5NiwiZXhwIjoyMDgxODM0NTk2fQ.ZqDpwTzkGbirFxrCXWP5FNE0ehNWkasa7AM6BnwVXkw
```

### How to Fix in Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your Bookiji project

2. **Navigate to Environment Variables**
   - Go to: Settings → Environment Variables

3. **Add/Update These Variables**
   - Make sure they're set for **Production** environment
   - If they exist, verify they match the values above
   - If missing, add them

4. **Redeploy**
   - After updating env vars, trigger a new deployment
   - Or wait for the next automatic deployment

### Verify After Deployment

1. Check browser console on production site
2. Look for errors about missing Supabase config
3. Test login functionality

### Alternative: Check via Vercel CLI

```bash
vercel env ls
```

This will show all environment variables configured for your project.

