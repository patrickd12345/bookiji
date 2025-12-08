# Test Coverage Verification (April 2025)

## Overview
Bookiji's automated suites provide broad coverage across the booking experience, platform policies, and supporting integrations. The notes below cross-reference the existing tests to confirm alignment with the product features delivered to date.

## Core user journeys and bookings
- **End-to-end booking lifecycle**: Playwright suites exercise the main book → pay → confirm path, rebooking from confirmations, and calendar export flows for Google Calendar and ICS downloads (`smoke.book-pay-confirm.spec.ts`, `rebook.spec.ts`, `calendar-links.spec.ts`).【F:tests/README.md†L38-L66】
- **Policy enforcement**: Smoke tests assert the homepage omits cancel/reschedule buttons and that the FAQ and cancellation API enforce the phone-only policy.【F:tests/smoke.spec.ts†L3-L45】

## Platform safety and access control
- **Admin protection**: Admin guard tests ensure unauthenticated users are redirected or blocked while public pages remain reachable.【F:tests/admin-guard.spec.ts†L3-L49】
- **Rate limiting**: API hammering confirms payment intent endpoints return 429 responses once thresholds are exceeded and otherwise stay within expected response codes.【F:tests/rate-limit.spec.ts†L3-L33】
- **Webhook integrity**: A Stripe `payment_intent.succeeded` round-trip validates that webhook handling confirms bookings and marks fees as paid.【F:tests/webhook-roundtrip.spec.ts†L3-L53】

## Quality signals beyond happy paths
- **Internationalization coverage**: Vitest checks guarantee French and German translations include all keys present in the English locale.【F:tests/i18n/missingKeys.spec.ts†L1-L25】
- **Accessibility sweeps**: Axe-based Playwright runs validate the home page in light and dark modes for basic a11y invariants (visible main region, axe scan).【F:tests/a11y-home.spec.ts†L1-L11】
- **SEO and discoverability**: SEO tests assert the sitemap is reachable and that vendor pages emit valid JSON-LD with LocalBusiness/Service data.【F:tests/seo.spec.ts†L1-L39】

## Remaining gaps and recommendations
- The current suites do not yet include visual regression, mobile viewport, or formal API contract testing; these are already called out as next steps in the test README.【F:tests/README.md†L169-L183】
- Maintain up-to-date seeded data (`TEST_VENDOR_SLUG`, `TEST_SERVICE_ID`) so the Stripe, webhook, and vendor SEO tests continue to reflect real deployments.【F:tests/README.md†L5-L11】【F:tests/README.md†L38-L66】

## Verdict
The present automated coverage exercises the critical booking flows, policy enforcement (no in-app cancellations), admin gating, payments/webhooks, SEO, a11y, and i18n. The outstanding items are mostly incremental quality layers (visual regression, mobile form factors, API contract coverage) rather than missing core functionality tests.【F:tests/README.md†L48-L67】【F:tests/smoke.spec.ts†L3-L45】【F:tests/seo.spec.ts†L1-L39】【F:tests/rate-limit.spec.ts†L3-L33】
