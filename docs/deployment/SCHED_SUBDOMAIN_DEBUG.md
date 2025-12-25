# Debugging sched.bookiji.com Routing

## Issue
`sched.bookiji.com` shows the main Bookiji homepage instead of the scheduling page.

## Middleware Configuration

The middleware should:
1. Detect `sched.` subdomain
2. Rewrite `/` to `/sched`
3. Show `src/app/sched/page.tsx`

## Potential Issues

### 1. Middleware Matcher Not Matching Root Path

The current matcher is:
```typescript
'/((?!api|_next/static|_next/image|favicon.ico).*)'
```

This regex might not match the root path `/` correctly. The pattern `.*` requires at least one character after the `/`, but `/` has no characters after it.

**Fix**: The matcher should explicitly include `/` or use a pattern that matches empty strings.

### 2. Root Page Taking Precedence

If `src/app/page.tsx` exists and is a server component, it might be rendering before the middleware rewrite takes effect.

**Check**: Verify if the root page is being rendered instead of the rewrite.

### 3. Vercel Edge Middleware Caching

Vercel might be caching the middleware response or the page.

**Fix**: 
- Clear Vercel edge cache
- Add cache-busting headers
- Force a new deployment

### 4. Middleware Not Running

The middleware might not be executing at all.

**Debug**: 
- Check Vercel function logs
- Add console.log to middleware
- Verify middleware is in root directory

## Testing Locally

1. Add to hosts file:
   ```
   127.0.0.1 sched.localhost
   ```

2. Run dev server:
   ```bash
   pnpm dev
   ```

3. Visit `http://sched.localhost:3000`

4. Check if middleware rewrite works

## Next Steps

1. Verify middleware matcher includes root path
2. Check if root page conflicts
3. Test locally with hosts file
4. Check Vercel deployment logs
5. Verify domain assignment in Vercel dashboard

