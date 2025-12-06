# App Review Findings & Fixes

## Summary

Three critical findings from app review with implemented fixes:

1. ✅ Production landing page defaults to maintenance view
2. ✅ Homepage CTAs are stubbed instead of driving flows
3. ✅ Auth hook mutates profiles client-side without validation

---

## Finding 1: Production Landing Page Issue

### Problem
- `src/app/page.tsx` shows maintenance page in production when `ADSENSE_APPROVAL_MODE` is not set
- No explicit launch flag - real homepage only shows with AdSense mode
- Production deploy without env variable shows placeholder instead of actual experience

### Root Cause
```typescript
// OLD: Inverted logic - maintenance is default in production
if (isProduction && !ADSENSE_APPROVAL_MODE) {
  return <MaintenancePage />
}
```

### Solution: Explicit Launch Configuration

**New File:** `src/app/page.tsx`

```typescript
const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE || 'live'
const isMaintenanceMode = LAUNCH_MODE === 'maintenance' && process.env.NODE_ENV === 'production'

// Default: 'live' - shows real experience
// Can override with: NEXT_PUBLIC_LAUNCH_MODE=maintenance
```

**Benefits:**
- Defaults to 'live' mode - real experience in production by default
- Explicit configuration controls the landing page state
- Easy to toggle with env variable
- Clear intent in code

### Deployment
```bash
# Production (default - shows real landing)
NODE_ENV=production

# Production maintenance mode
NEXT_PUBLIC_LAUNCH_MODE=maintenance NODE_ENV=production

# Development (always shows real landing)
NODE_ENV=development
```

---

## Finding 2: Homepage CTAs Not Wired

### Problem
- Primary search CTA only opens AI chat modal and logs to console
- Demo CTA just toggles modal - no actual demo experience
- "Most prominent calls-to-action feel unfinished"

### Root Cause
```typescript
// OLD: Stub handlers
const handleSearch = () => {
  setShowAIChat(true)
  console.log('Searching for:', searchQuery) // No-op
}
```

### Solution: Wire CTAs to Real Flows

**Updated:** `src/app/HomePageClient.tsx`

```typescript
// Search CTA → Search page with query param
const handleSearch = () => {
  if (searchQuery.trim()) {
    const encoded = encodeURIComponent(searchQuery.trim())
    window.location.href = `/search?q=${encoded}`
  }
}

// Demo CTA → Guided tour experience
const handleDemo = () => {
  setShowDemo(true)  // Show interactive demo flow
  setShowTour(true)  // Start guided tour
}
```

**Benefits:**
- Search now navigates to search results page
- Demo flows into actual guided tour
- CTAs drive real user experiences
- Smooth conversion paths

### Next Steps
1. Ensure `/search` page exists and handles `q` query param
2. Verify guided tour works with demo flow
3. Test CTAs end-to-end

---

## Finding 3: Client-Side Profile Mutations

### Problem
- `hooks/useAuth.ts` auto-creates profile on client without validation
- Supabase writes from browser without authorization checks
- Can pollute data and mask backend issues
- "Silent continuation even on errors"

### Root Cause
```typescript
// OLD: Unsafe client-side upsert
const { error: upsertError } = await supabase
  .from('profiles')
  .upsert({ id: userId, full_name: 'User', role: 'customer' }, { onConflict: 'id' })

if (upsertError) {
  console.warn('Profile upsert error (non-fatal):', upsertError) // Silent failure
}
```

### Solution: Server-Side Profile Management

**New API Endpoint:** `src/app/api/auth/profile/create/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate user (server-side)
  const { user } = await supabase.auth.getUser()
  if (!user) return 401

  // 2. Validate input
  const { role } = await request.json()
  if (!['customer', 'vendor'].includes(role)) return 400

  // 3. Create profile with proper error handling
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, role, ... })
    .select()
    .single()

  if (error) return 500

  // 4. Return created profile
  return { success: true, profile }
}
```

**Updated:** `hooks/useAuth.ts`

```typescript
// OLD: Remove client-side upsert
if (!data) {
  // Don't create here - return null
  return null
}

// NEW: Client calls server API if needed
// const profile = await fetch('/api/auth/profile/create', {
//   method: 'POST',
//   body: JSON.stringify({ role: 'customer' })
// })
```

**Benefits:**
- Validation happens server-side with full context
- No unauthorized writes from browser
- Clear error handling and logging
- Easy to add future rules/checks
- Better security posture

### Usage in Client

When profile is missing, components should:

```typescript
if (!profile && isAuthenticated) {
  // Call server API to create profile
  try {
    const res = await fetch('/api/auth/profile/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'customer' })
    })
    const { profile: newProfile } = await res.json()
    setProfile(newProfile)
  } catch (error) {
    console.error('Failed to create profile:', error)
    // Show error to user instead of silent failure
  }
}
```

---

## Testing Checklist

### Fix 1: Landing Page
- [ ] Dev mode: Shows real homepage
- [ ] Production with `NEXT_PUBLIC_LAUNCH_MODE=live`: Shows real homepage
- [ ] Production with `NEXT_PUBLIC_LAUNCH_MODE=maintenance`: Shows maintenance page
- [ ] Production without env var: Shows real homepage (default)

### Fix 2: Homepage CTAs
- [ ] Search CTA navigates to `/search?q=...` with query
- [ ] Demo CTA opens interactive demo and guided tour
- [ ] Search page loads properly
- [ ] Guided tour flow works

### Fix 3: Profile Creation
- [ ] New user logs in without profile
- [ ] Components detect missing profile
- [ ] Call to `/api/auth/profile/create` succeeds
- [ ] Profile created in database
- [ ] Auth hook reflects new profile
- [ ] Error handling shows user-facing errors

---

## Files Modified

1. `src/app/page.tsx` - Added explicit launch configuration
2. `src/app/HomePageClient.tsx` - Wired search CTA to search page
3. `hooks/useAuth.ts` - Removed client-side profile creation
4. `src/app/api/auth/profile/create/route.ts` - NEW: Server-side profile creation

---

## Deployment Notes

### Environment Variables
```bash
# Optional - defaults to 'live'
NEXT_PUBLIC_LAUNCH_MODE=live|maintenance

# Must already be set
ADSENSE_APPROVAL_MODE=true|false
```

### Rollout Strategy
1. Deploy with all three fixes together
2. Monitor error logs for profile creation issues
3. Verify search redirects working
4. Check landing page displays correctly

### Rollback
If issues occur:
- Set `NEXT_PUBLIC_LAUNCH_MODE=maintenance` to show maintenance page
- Revert to old auth hook if profile creation fails
- Check error logs for detailed diagnostics

---

## Future Improvements

1. **Profile Creation**: Add email verification before profile creation
2. **Launch Mode**: Add admin dashboard to toggle launch mode
3. **Search**: Implement full search experience with filters
4. **CTA Tracking**: Add analytics to CTA clicks for conversion tracking
5. **Error Recovery**: Auto-retry profile creation with exponential backoff

