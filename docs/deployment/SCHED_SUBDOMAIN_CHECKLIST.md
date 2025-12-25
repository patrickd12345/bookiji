# sched.bookiji.com Subdomain Setup Checklist

## ✅ Completed

- [x] Domain added to Vercel project
- [x] Subdomain routing in middleware
- [x] Scheduling landing page created (`/sched`)
- [x] Mobile responsive design
- [x] Build errors fixed (`@types/pg`)

## ⚠️ Potential Issues to Check

### 1. **Cookie Domain Configuration**
**Issue**: Cookies may not work across subdomains  
**Check**: Cookies need `domain: '.bookiji.com'` for cross-subdomain support  
**Files to check**:
- `src/lib/cookieStore.ts`
- `src/lib/auth.ts`
- `src/app/api/validate-access/route.ts`
- Supabase auth cookies

**Fix needed**: Add `domain: '.bookiji.com'` to cookie options in production

### 2. **OAuth Redirect URIs**
**Issue**: Google/GitHub OAuth may not allow redirects to subdomain  
**Check**: OAuth providers need redirect URIs registered for both domains  
**Files to check**:
- `src/app/api/auth/google/callback/route.ts`
- `src/app/api/auth/github/callback/route.ts`
- Environment variables: `GOOGLE_REDIRECT_URI`, `GITHUB_REDIRECT_URI`

**Fix needed**: Add `https://sched.bookiji.com/api/auth/*/callback` to OAuth app settings

### 3. **Environment Variables**
**Issue**: `NEXT_PUBLIC_APP_URL` might be hardcoded to main domain  
**Check**: Some features might use wrong base URL  
**Files to check**:
- `src/app/sitemap.ts` (uses `NEXT_PUBLIC_APP_URL`)
- `src/app/robots.ts` (uses `NEXT_PUBLIC_APP_URL`)
- API routes that construct URLs

**Fix needed**: Make URLs subdomain-aware or use request hostname

### 4. **SEO & Meta Tags**
**Issue**: Subdomain might not have proper SEO tags  
**Check**: Meta tags, OpenGraph, Twitter cards  
**Files to check**:
- `src/app/sched/page.tsx` (needs metadata)
- `src/app/layout.tsx` (should be subdomain-aware)

**Fix needed**: Add metadata export to `/sched` page

### 5. **Sitemap & Robots.txt**
**Issue**: Subdomain might be indexed separately  
**Check**: Should sched subdomain be in sitemap?  
**Files to check**:
- `src/app/sitemap.ts`
- `src/app/robots.ts`

**Fix needed**: Decide if subdomain should be indexed or excluded

### 6. **Analytics Tracking**
**Issue**: Analytics might not track subdomain separately  
**Check**: PostHog, Vercel Analytics, etc.  
**Files to check**:
- `src/app/layout.tsx` (analytics setup)

**Fix needed**: Configure analytics to track subdomain as separate property/source

### 7. **CORS Configuration**
**Issue**: API calls from subdomain might be blocked  
**Check**: CORS headers in API routes  
**Files to check**:
- `middleware.ts` (CORS headers)
- API routes that might need CORS

**Fix needed**: Ensure CORS allows subdomain origins

### 8. **Stripe Webhooks**
**Issue**: Webhook URLs might be hardcoded  
**Check**: Stripe webhook configuration  
**Files to check**:
- `src/app/api/stripe/webhook/route.ts`
- Stripe dashboard webhook settings

**Fix needed**: Verify webhooks work from both domains (they should)

### 9. **Email Links**
**Issue**: Email links might point to wrong domain  
**Check**: Email templates, confirmation links  
**Files to check**:
- Email sending code
- Confirmation/reset password links

**Fix needed**: Use request hostname or make links subdomain-aware

### 10. **Canonical URLs**
**Issue**: SEO duplicate content issues  
**Check**: Canonical tags should point to correct domain  
**Files to check**:
- `src/app/layout.tsx`
- `src/app/sched/page.tsx`

**Fix needed**: Add canonical URL based on subdomain

### 11. **API Internal Calls**
**Issue**: Internal API calls might use wrong base URL  
**Check**: Fetch calls that use `NEXT_PUBLIC_APP_URL`  
**Files found**:
- `src/app/api/vendor/run-certification/route.ts`
- `src/app/api/ops/controlplane/_lib/simcity-llm-executor.ts`

**Fix needed**: Use relative URLs or detect hostname from request

### 12. **Supabase Auth Configuration**
**Issue**: Supabase might need subdomain in redirect URLs  
**Check**: Supabase dashboard → Authentication → URL Configuration  
**Files to check**:
- Supabase project settings

**Fix needed**: Add `https://sched.bookiji.com/**` to allowed redirect URLs

## 🔍 Testing Checklist

- [ ] Visit `https://sched.bookiji.com` - shows scheduling page
- [ ] Visit `https://sched.bookiji.com/vendor/schedule` - works correctly
- [ ] Login from subdomain - session persists
- [ ] OAuth login from subdomain - redirects correctly
- [ ] API calls from subdomain - work correctly
- [ ] Cookies work across subdomains
- [ ] Links in emails work on subdomain
- [ ] Stripe payments work from subdomain
- [ ] Mobile responsive on subdomain
- [ ] SEO meta tags present
- [ ] Analytics tracking subdomain separately

## 🚀 Quick Fixes Needed

1. **Add cookie domain** (if cross-subdomain auth needed)
2. **Add metadata to `/sched` page**
3. **Update OAuth redirect URIs** (if using OAuth)
4. **Update Supabase redirect URLs** (if using Supabase auth)
5. **Make sitemap subdomain-aware** (optional)

