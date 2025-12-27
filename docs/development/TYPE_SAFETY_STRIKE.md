# Type Safety Strike - Critical Paths Only

## Status: In Progress 🚧

Following the same pragmatic approach as the console.log migration: **critical paths only, lint/CI guardrails, no ideology**.

## Goal

Eliminate `any` types in critical paths (money, auth, ops) to prevent runtime errors and improve maintainability.

## Critical Paths Identified

### Money (Payment & Refunds)
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `src/app/api/bookings/confirm/route.ts` - Booking confirmation
- `src/app/api/ops/refund/route.ts` - Refund processing
- `src/lib/services/stripe.ts` - Stripe service layer
- `src/lib/services/refundService.ts` - Refund service

### Auth (Authentication & Authorization)
- `src/app/api/auth/check-admin/route.ts` - Admin check
- `src/app/api/auth/register/route.ts` - User registration
- `src/app/api/user/roles/route.ts` - Role management
- `src/lib/auth/requireAdmin.ts` - Admin authorization

### Ops (Operations & Booking State)
- `src/app/api/bookings/create/route.ts` - Booking creation
- `src/app/api/ops/force-cancel/route.ts` - Force cancel
- `src/lib/services/bookingStateMachine.ts` - State machine
- `src/lib/services/bookingWorker.ts` - Booking worker

## ESLint Rule Configuration

**Implementation:** Add to `eslint.config.mjs`

```javascript
// Ban explicit any in critical paths (money, auth, ops)
{
  files: [
    "src/lib/services/**/*",
    "src/lib/auth/**/*",
    "src/app/api/webhooks/**/*",
    "src/app/api/bookings/**/*",
    "src/app/api/ops/**/*",
    "src/app/api/auth/**/*"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error", // Strict ban in critical paths
  },
},
// Warn on any in other paths (allow for now, migrate opportunistically)
{
  files: ["src/**/*"],
  ignores: [
    "src/lib/services/**/*",
    "src/lib/auth/**/*",
    "src/app/api/webhooks/**/*",
    "src/app/api/bookings/**/*",
    "src/app/api/ops/**/*",
    "src/app/api/auth/**/*"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn", // Warn but don't fail
  },
}
```

## Known Issues to Fix

### High Priority (Money Paths)
1. `src/lib/services/stripe.ts` - Lines 248, 305, 357, 387: `as any` casts
2. `src/lib/services/bookingStateMachine.ts` - Line 5: Proxy `as any`
3. `src/lib/services/refundService.ts` - Line 5: Proxy `as any`

### Medium Priority (Auth Paths)
1. `src/app/api/user/roles/route.ts` - Line 5: Proxy `as any`
2. `src/app/api/auth/register/route.ts` - Line 6: Proxy `as any`

### Low Priority (Ops Paths)
1. `src/lib/services/bookingWorker.ts` - Lines 108, 167, 212: `event: any` parameters
2. `src/app/api/ops/controlplane/simcity/start/route.ts` - Line 15: `body: any`

## Strategy

1. **Fix Proxy pattern first** - Create a properly typed Supabase client wrapper
2. **Fix Stripe types** - Use proper Stripe types instead of `as any`
3. **Fix event handlers** - Type event parameters properly
4. **Add ESLint rule** - Prevent regression

## Progress Tracking

- [ ] ESLint rule added
- [ ] Proxy pattern fixed
- [ ] Stripe types fixed
- [ ] Event handlers typed
- [ ] All critical paths pass type check

## Notes

- **No ideology**: We're not eliminating all `any` types, just critical paths
- **Pragmatic**: Some `any` types in admin/dev tools are acceptable
- **Similar to logging**: Same approach as console.log migration
- **CI guardrails**: ESLint will prevent new `any` types in critical paths


