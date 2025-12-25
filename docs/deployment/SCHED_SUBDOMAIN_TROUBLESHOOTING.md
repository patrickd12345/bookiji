# sched.bookiji.com Troubleshooting Guide

## Issue: Subdomain not showing scheduling page

### Current Setup

1. **Middleware** (`middleware.ts`):
   - Detects `sched.` subdomain
   - Rewrites `/` to `/sched` for sched subdomain
   - Location: Lines 68-76

2. **Scheduling Page** (`src/app/sched/page.tsx`):
   - Exists and has content
   - Has layout with metadata

3. **Domain Configuration**:
   - Domain added to Vercel: `sched.bookiji.com`
   - Domain exists in account

### Potential Issues

#### 1. Deployment Not Updated
**Symptom**: Domain shows old homepage
**Fix**: 
```bash
vercel --prod
```

#### 2. DNS Not Propagated
**Symptom**: Domain doesn't resolve or shows 404
**Check**:
```bash
nslookup sched.bookiji.com
dig sched.bookiji.com
```
**Fix**: Wait for DNS propagation (can take up to 48 hours)

#### 3. Middleware Not Running
**Symptom**: Shows main homepage instead of `/sched`
**Check**: 
- Verify middleware.ts is in root directory
- Check middleware matcher includes root path
- Verify no build errors

#### 4. Domain Not Assigned to Deployment
**Symptom**: Shows 404 or wrong content
**Check**:
```bash
vercel domains inspect sched.bookiji.com
```
**Fix**: 
- Ensure domain is assigned to latest production deployment
- May need to trigger new deployment

#### 5. Caching Issues
**Symptom**: Shows old content
**Fix**:
- Clear browser cache
- Try incognito/private mode
- Check Vercel edge cache settings

### Debugging Steps

1. **Check if middleware is running**:
   - Add console.log in middleware
   - Check Vercel function logs
   - Verify hostname detection

2. **Check if page exists**:
   - Verify `src/app/sched/page.tsx` exists
   - Check for build errors
   - Verify page exports default component

3. **Check domain configuration**:
   ```bash
   vercel domains list
   vercel domains inspect sched.bookiji.com
   ```

4. **Test locally**:
   - Add `127.0.0.1 sched.localhost` to hosts file
   - Test with `http://sched.localhost:3000`
   - Verify middleware rewrite works

5. **Check Vercel deployment**:
   - Go to Vercel dashboard
   - Check latest deployment
   - Verify domain is assigned
   - Check deployment logs

### Quick Fixes

1. **Force new deployment**:
   ```bash
   vercel --prod --force
   ```

2. **Verify middleware matcher**:
   - Ensure root path `/` is included in matcher
   - Check for conflicting routes

3. **Check for build errors**:
   ```bash
   pnpm build
   ```

4. **Verify domain assignment**:
   - Go to Vercel dashboard → Project → Settings → Domains
   - Ensure `sched.bookiji.com` is listed
   - Check if it's assigned to a deployment

### Expected Behavior

When accessing `https://sched.bookiji.com/`:
1. Middleware detects `sched.` subdomain
2. Rewrites `/` to `/sched`
3. Shows `src/app/sched/page.tsx` content
4. URL remains `https://sched.bookiji.com/` (rewrite, not redirect)

### Current Status

- ✅ Middleware configured
- ✅ Scheduling page exists
- ✅ Domain added to Vercel
- ⚠️ Need to verify deployment and domain assignment

