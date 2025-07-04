# Test Plan

This document lists the automated tests in the repository and captures the results of executing them in the current environment.

| App Path | Description | Expected Result | Result | Comments |
| --- | --- | --- | --- | --- |
| `tests/api/analytics.system.spec.ts` | API test for `GET /api/analytics/system` returning aggregated metrics | Should respond 200 with metrics object | Blocked | Vitest dependencies missing |
| `tests/api/analytics.track.spec.ts` | API test for `POST /api/analytics/track` storing analytics events and funnel events | Should respond 200 with success true | Blocked | Vitest dependencies missing |
| `tests/api/blocks.spec.ts` | API tests for creating, listing and deleting user blocks | Should create/list/delete blocks successfully | Blocked | Vitest dependencies missing |
| `tests/api/bookings.create.spec.ts` | API test for `POST /api/bookings/create` creating a booking | Should return booking creation result | Blocked | Vitest dependencies missing |
| `tests/api/bookings.user.spec.ts` | API test for `GET /api/bookings/user` fetching user's bookings | Should return bookings or handle errors gracefully | Blocked | Vitest dependencies missing |
| `tests/api/credits.status.spec.ts` | API test for `GET /api/credits/status` returning loyalty status | Should return status with progress | Blocked | Vitest dependencies missing |
| `tests/api/referrals.create.spec.ts` | API test for `POST /api/referrals/create` recording referral | Should return success true | Blocked | Vitest dependencies missing |
| `tests/api/register.referral.spec.ts` | API test for `POST /api/auth/register` with referral crediting | Should register user and credit referrer | Blocked | Vitest dependencies missing |
| `tests/components/ui/BookingForm.test.tsx` | Component test for BookingForm behaviour (rendering, slot loading, credit display, validation) | Should render fields, load slots and validate input | Blocked | Vitest dependencies missing |
| `tests/components/ui/Button.test.tsx` | Component test for Button | Should render children correctly | Blocked | Vitest dependencies missing |
| `tests/components/ui/Card.test.tsx` | Component tests for Card variants | Should apply classes and render content | Blocked | Vitest dependencies missing |
| `tests/components/ui/Input.test.tsx` | Component tests for Input | Should handle input and attributes correctly | Blocked | Vitest dependencies missing |
| `tests/components/ui/Label.test.tsx` | Component tests for Label | Should render labels and pass attributes | Blocked | Vitest dependencies missing |
| `tests/guidedTours.spec.ts` | Ensures guided tours exist for required routes | Should find no missing tours | Blocked | Vitest dependencies missing |
| `tests/lib/bookingEngine.spec.ts` | BookingEngine unit test for no available slot error | Should return error when no slot available | Blocked | Vitest dependencies missing |
| `tests/picasso.test.ts` | Sanity test ensuring no deprecated `/marketplace` route exists | Should find no references | Blocked | Vitest dependencies missing |

All tests were blocked from execution because `vitest` and other node modules are not installed in the environment. Installing dependencies requires network access which is currently unavailable.
