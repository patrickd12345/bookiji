# sched.bookiji.com Full Check Report

## ✅ Fixed Issues

### 1. Cookie Domain Configuration
- **Status**: ✅ FIXED
- **Changes**: 
  - Created `src/lib/cookieHelpers.ts` with `getCookieOptions()` helper
  - Updated `src/lib/cookieStore.ts` to use cookie helper
  - Updated `src/app/api/validate-access/route.ts` to use subdomain cookie domain
  - Updated `src/lib/supabase-server-client.ts` to use `getSupabaseCookieOptions()` for cross-subdomain support
  - Updated `src/app/api/auth/sync-session/route.ts` to use subdomain-aware cookies
- **Note**: All cookie sets now use consistent domain configuration

### 2. SEO Metadata
- **Status**: ✅ FIXED
- **Changes**: Created `src/app/sched/layout.tsx` with proper metadata
- **Includes**: Title, description, OpenGraph, Twitter cards, canonical URL

### 3. Base URL Helper
- **Status**: ✅ CREATED
- **Changes**: Created `src/lib/getBaseUrl.ts` to detect hostname from request
- **Usage**: Can be used in API routes to get subdomain-aware URLs

### 4. Google OAuth Redirect
- **Status**: ⚠️ PARTIALLY FIXED
- **Changes**: Added fallback logic, but still uses env var primarily
- **Action Required**: Add `https://sched.bookiji.com/api/auth/google/callback` to Google OAuth Console

### 5. Email Links
- **Status**: ⚠️ NEEDS ATTENTION
- **Issue**: Email templates use `NEXT_PUBLIC_BASE_URL` which is hardcoded
- **Impact**: Email links will always point to main domain
- **Fix**: Update email sending to use request-based URL (requires refactoring)

## ⚠️ Remaining Issues

### 1. OAuth Redirect URIs (CRITICAL)
**Files**: 
- `src/app/api/auth/google/callback/route.ts`
- `src/lib/calendar-adapters/google.ts`

**Action Required**:
1. Google OAuth Console: Add `https://sched.bookiji.com/api/auth/google/callback` to authorized redirect URIs
2. Update `GOOGLE_REDIRECT_URI` env var or ensure it supports multiple domains

### 2. Supabase Auth Redirect URLs (CRITICAL)
**Action Required**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add `https://sched.bookiji.com/**` to allowed redirect URLs
3. Add `https://sched.bookiji.com` to site URL (or use wildcard)

### 3. Email Link URLs
**Files**:
- `src/lib/services/emailTemplates.ts` (now accepts `request` parameter)
- `src/lib/notifications/providers.ts` (updated to pass request)
- `src/lib/notifications/intentDispatcher.ts` (updated to accept request)
- `src/lib/notifications/center.ts` (updated to accept request)
- `src/app/api/notifications/send/route.ts` (passes request context)

**Status**: ✅ FIXED
- **Changes**: 
  - Email templates now accept optional `request` parameter for subdomain-aware URLs
  - Notification functions updated to pass request context when available
  - Falls back to `NEXT_PUBLIC_BASE_URL` when request not available (e.g., background jobs)
- **Note**: Email links will use the correct subdomain when sent from API routes with request context

### 4. Internal API Calls
**Files**:
- `src/app/api/ops/controlplane/_lib/simcity-llm-executor.ts` (8 instances - all fixed)
- `src/app/api/admin/cron/trigger/route.ts` (fixed - uses request hostname)
- `src/app/api/admin/kb/trigger-crawl/route.ts` (fixed - uses request hostname)
- `src/app/api/admin/kb/trigger-dedupe/route.ts` (fixed - uses request hostname)
- `src/app/api/admin/kb/trigger-vectorize/route.ts` (fixed - uses request hostname)
- `src/app/api/cron/kb-ensure-embeddings/route.ts` (fixed - uses request hostname)
- `src/app/api/cron/sitemap-refresh/route.ts` (fixed - uses request hostname)

**Status**: ✅ FIXED
- **Changes**: 
  - SimCity executor now uses relative URLs for internal API calls
  - Admin and cron routes use request hostname for subdomain support
  - Falls back to env var when request not available

### 5. Cookie Domain Consistency
**Status**: ✅ FIXED

**Files Updated**:
- `src/lib/cookieHelpers.ts` - Created helper for consistent cookie options
- `src/lib/cookieStore.ts` - Uses helper for default options
- `src/lib/supabaseCookieConfig.ts` - Created Supabase-specific cookie config
- `src/lib/supabase-server-client.ts` - Uses subdomain-aware cookie options
- `src/app/api/auth/sync-session/route.ts` - Uses subdomain-aware cookies
- `src/app/api/validate-access/route.ts` - Uses cookie helper

**Impact**: 
- All cookie sets now use consistent domain configuration
- Supabase auth cookies work across subdomains
- Custom cookies work across subdomains in production

### 6. Analytics Configuration
**Status**: ⚠️ NOT CONFIGURED

**Files**:
- `src/app/layout.tsx` (Vercel Analytics, Speed Insights)

**Action**: Configure analytics to track subdomain separately (optional)

### 7. Sitemap & Robots.txt
**Status**: ℹ️ INFO

**Files**:
- `src/app/sitemap.ts` - Uses `NEXT_PUBLIC_APP_URL`
- `src/app/robots.ts` - Uses `NEXT_PUBLIC_APP_URL`

**Impact**: Low - subdomain will have its own sitemap/robots
**Action**: None required (works as-is)

### 8. CORS Configuration
**Status**: ✅ OK

**Files**:
- `middleware.ts` - No CORS issues expected
- Next.js handles CORS automatically for same-origin requests

## 🧪 Testing Checklist

### Critical Tests
- [ ] Visit `https://sched.bookiji.com` - shows scheduling page
- [ ] Login from subdomain - session works
- [ ] OAuth login from subdomain - redirects correctly (requires OAuth config)
- [ ] API calls from subdomain - work correctly
- [ ] Cookies persist on subdomain
- [ ] Navigation between subdomain and main domain - works

### Email Tests
- [ ] Password reset email - link works (will go to main domain)
- [ ] Email verification - link works (will go to main domain)
- [ ] Booking confirmation - links work

### Edge Cases
- [ ] Direct API access from subdomain
- [ ] Webhook endpoints from subdomain
- [ ] Stripe redirects from subdomain
- [ ] Supabase auth redirects from subdomain

## 🚀 Deployment Checklist

Before deploying:
1. ✅ Domain added to Vercel
2. ✅ Subdomain routing in middleware
3. ✅ Scheduling page created
4. ✅ Metadata added
5. ✅ Cookie domain configured
6. ⚠️ **Add OAuth redirect URIs** (Google Console)
7. ⚠️ **Add Supabase redirect URLs** (Supabase Dashboard)
8. ✅ Build errors fixed

## 📝 Environment Variables to Check

```bash
# Should support both domains
NEXT_PUBLIC_APP_URL=https://bookiji.com  # Main domain
GOOGLE_REDIRECT_URI=https://bookiji.com/api/auth/google/callback  # Will need subdomain added in OAuth console
NEXT_PUBLIC_BASE_URL=https://bookiji.com  # Used for emails
```

## 🎯 Priority Actions

### High Priority (Do Before Launch)
1. **Add OAuth redirect URIs** - Google OAuth Console
2. **Add Supabase redirect URLs** - Supabase Dashboard

### Medium Priority (Can Do After Launch)
1. Email link handling (decide on approach)
2. Analytics subdomain tracking
3. Cookie domain consistency (if cross-subdomain auth needed)

### Low Priority (Nice to Have)
1. Analytics subdomain separation
2. Sitemap subdomain handling
3. Internal API call optimization

## 📚 Related Documentation

- `docs/deployment/ADD_SCHED_SUBDOMAIN.md` - Setup instructions
- `docs/deployment/SCHED_SUBDOMAIN_CHECKLIST.md` - Quick checklist

