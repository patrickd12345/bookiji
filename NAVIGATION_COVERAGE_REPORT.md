# Navigation Coverage Report

Generated: 2026-01-03T14:16:28.340Z

## Summary

- **Total Routes**: 106
- **Navigation Links**: 85
- **Reachable Routes**: 96 (91%)
- **Unreachable Routes**: 10 (9%)

## Unreachable Routes

- `/auth/callback`
- `/auth/reset`
- `/auth/verify`
- `/book/:vendorId`
- `/confirm/:bookingId`
- `/e2e/cert`
- `/home-modern`
- `/pay/:bookingId`
- `/ratings/booking/:bookingId`
- `/verify-email`

## Recommendations


1. Add navigation links for unreachable routes
2. Consider adding these routes to appropriate navigation components:
   - Admin routes → `src/components/admin/Sidebar.tsx`
   - Customer routes → `src/components/customer/CustomerNavigation.tsx`
   - Vendor routes → `src/components/vendor/VendorNavigation.tsx`
   - Public routes → `src/components/MainNavigation.tsx` or `src/components/Footer.tsx`

