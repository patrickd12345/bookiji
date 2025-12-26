# Vercel Environment Variables Checklist

## ✅ Currently Set (from your list):
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `NEXT_PUBLIC_APP_URL` ✅
- `NEXT_PUBLIC_BASE_URL` ✅
- `NODE_ENV` ✅
- `GOOGLE_CLIENT_SECRET` ✅
- `GOOGLE_REDIRECT_URI` ✅

## ❌ Missing Critical Variables:

### 1. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Recommended)
**Value:** `sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz`
- Used as fallback if ANON_KEY is missing
- Some newer Supabase features may require it

### 2. `SUPABASE_SERVICE_ROLE_KEY` (Critical for Server-Side)
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI1ODU5NiwiZXhwIjoyMDgxODM0NTk2fQ.ZqDpwTzkGbirFxrCXWP5FNE0ehNWkasa7AM6BnwVXkw`
- Required for server-side operations
- Admin operations, migrations, etc.

## 🔍 Verification Steps:

### Step 1: Verify Current Values Match
Since values are masked, verify they match your `.env.local`:

1. **NEXT_PUBLIC_SUPABASE_URL** should be:
   ```
   https://uradoazoyhhozbemrccj.supabase.co
   ```

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY** should be:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTg1OTYsImV4cCI6MjA4MTgzNDU5Nn0.ofJNCe4yD3Z_ZgAuuPdHE6mKDJBqf5wbd5MU-MMILnQ
   ```

3. **NEXT_PUBLIC_APP_URL** should be (for production):
   ```
   https://bookiji.com
   ```
   (Not `http://localhost:3000`)

4. **NEXT_PUBLIC_BASE_URL** should be (for production):
   ```
   https://bookiji.com
   ```
   (Not `http://localhost:3000`)

### Step 2: Add Missing Variables

In Vercel Dashboard → Settings → Environment Variables:

1. Click "Add New"
2. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Value: `sb_publishable_E5HX8sFsapD2Qn2fsdd1Kw_ikzHofuz`
   - Environment: Production (and Preview/Development if needed)

3. Click "Add New" again
4. Add `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYWRvYXpveWhob3piZW1yY2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjI1ODU5NiwiZXhwIjoyMDgxODM0NTk2fQ.ZqDpwTzkGbirFxrCXWP5FNE0ehNWkasa7AM6BnwVXkw`
   - Environment: Production (and Preview/Development if needed)

### Step 3: Update Production URLs

If `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_BASE_URL` are set to `http://localhost:3000`, update them to:
- `https://bookiji.com` (or your production domain)

### Step 4: Redeploy

After updating:
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Select "Redeploy"
4. Wait for deployment to complete
5. Test login again

## 🐛 If Still Not Working:

1. **Check Browser Console** (F12)
   - Look for specific error messages
   - Check Network tab for failed requests to Supabase

2. **Verify Supabase Project Status**
   - Go to: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj
   - Ensure project is not paused
   - Check if there are any service issues

3. **Test Supabase Connection Directly**
   - In browser console on production site, run:
   ```javascript
   fetch('https://uradoazoyhhozbemrccj.supabase.co/auth/v1/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error)
   ```

4. **Check CORS Settings**
   - In Supabase Dashboard → Settings → API
   - Verify your production domain is allowed

