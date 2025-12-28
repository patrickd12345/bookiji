# Bookiji Test Tracker (Single Source of Truth)

## Rules (non-negotiable)
1) This file is the **only** place we track feature tests.
2) A test checkbox `[x]` means: **verified against the current code**.
3) If **any code in a feature’s Code Scope changes**, then **ALL tests for that feature are invalidated**:
   - set all `[x]` → `[ ]`
   - update **Code Rev** (commit hash) + **Invalidated On**
   - add a short line in **Invalidation Log**
4) **SimCity is allowed to maintain this file** when it determines a test is completed:
   - SimCity updates are done by committing changes to `TEST_TRACKER.md` (this file remains the single source of truth).
   - SimCity may only check off a test when it was validated against the current **Code Rev** for that feature.
   - When SimCity marks a test complete, it must:
     - set the checkbox to `[x]`
     - fill the test’s **Comments:** line with a minimal provenance note (scenario/seed/run-id) and any key observations
     - update the feature-level **Last Verified On** date to the verification date
   - If SimCity observes the feature’s Code Scope changed since last verification, it must **invalidate first** (per rule #3), then re-verify.
5) A checked test may be **de-verified** (cleared) if it is determined a re-run is required (flaky signal, environment drift, new evidence, regression suspicion):
   - set the checkbox `[x]` → `[ ]`
   - add a short reason on the test’s **Comments:** line (who/why)
   - do **not** change feature-level **Code Rev** / **Invalidated On** unless code changed in scope (rule #3)
   - optionally append a note to the feature’s **Invalidation Log** if the reason is feature-wide

## How to update Code Rev (copy/paste)
- Get last change commit touching a feature’s scope:
  - `git log -1 --oneline -- <path>` (repeat for each scope path)
- Use the newest commit hash you find as **Code Rev**.

---

# Feature Registry

## FEAT-WEB-001 — Public Marketing & Info Pages
**Code Scope**
- `src/app/page.tsx`
- `src/app/HomePage*.tsx`
- `src/app/(dev)/`
- `src/app/about/`
- `src/app/how-it-works/`
- `src/app/faq/`
- `src/app/contact/`
- `src/app/blog/`
- `src/app/beta/`
- `src/app/application/`
- `src/components/`
- `src/app/home-modern/`
- `src/app/demo/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-WEB-001** — Home page renders without errors and main CTA(s) visible
  - Comments:
- [ ] **TC-WEB-002** — About/How-it-works/FAQ/Contact pages load and internal links work
  - Comments:
- [ ] **TC-WEB-003** — Navigation works on mobile + desktop (no dead routes from header/footer)
  - Comments:
- [ ] **TC-WEB-004** — No accidental dev/demo routes exposed in production build (route access check)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-SEO-002 — SEO, Indexing & Feed
**Code Scope**
- `src/lib/seo/`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/rss.xml`
- `src/app/layout.tsx`
- `src/app/metadata*`
- `src/utils/seo*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-SEO-001** — /sitemap.xml (generated) includes key public routes and excludes private/admin routes
  - Comments:
- [ ] **TC-SEO-002** — /robots.txt disallows private/admin routes; allows public pages
  - Comments:
- [ ] **TC-SEO-003** — Canonical tags + OpenGraph/Twitter metadata present on public pages
  - Comments:
- [ ] **TC-SEO-004** — RSS feed endpoint returns valid XML and includes latest posts (if blog enabled)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-A11Y-003 — Accessibility Baseline (A11y)
**Code Scope**
- `src/app/`
- `src/components/`
- `src/hooks/`
- `tests/a11y*`
- `src/lib/ui*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-A11Y-001** — Keyboard navigation: skip link works; focus order is logical on home + core flows
  - Comments:
- [ ] **TC-A11Y-002** — Landmarks/headings: exactly one H1 per page; main/nav/footer landmarks present
  - Comments:
- [ ] **TC-A11Y-003** — Forms: all inputs have labels; error messages announced / associated
  - Comments:
- [ ] **TC-A11Y-004** — Color/contrast check for primary UI elements on light/dark themes
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-MAINT-004 — Maintenance Mode
**Code Scope**
- `src/app/MaintenanceWrapper.tsx`
- `src/config/*maintenance*`
- `src/middleware/`
- `src/app/ops/`
- `src/app/admin/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-MAINT-001** — When maintenance flag enabled, public app shows maintenance UI consistently
  - Comments:
- [ ] **TC-MAINT-002** — Admin/ops bypass (if designed) behaves correctly and is still authenticated
  - Comments:
- [ ] **TC-MAINT-003** — SEO during maintenance: robots noindex or appropriate headers applied
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-AUTH-005 — Authentication (Login/Register/Forgot/Verify)
**Code Scope**
- `src/app/login/`
- `src/app/register/`
- `src/app/forgot-password/`
- `src/app/verify-email/`
- `src/app/auth/`
- `src/lib/auth/`
- `src/middleware/`
- `src/app/api/auth/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-AUTH-001** — Register new account; verification path works (or correctly skipped if disabled)
  - Comments:
- [ ] **TC-AUTH-002** — Login + session persistence across refresh; logout clears session
  - Comments:
- [ ] **TC-AUTH-003** — Forgot-password flow sends reset and permits password change
  - Comments:
- [ ] **TC-AUTH-004** — Protected routes redirect unauthenticated users to login (vendor + admin)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-ROLE-006 — Roles & Identity (Vendor/Customer/Admin) + Choose Role
**Code Scope**
- `src/app/choose-role/`
- `src/app/settings/`
- `src/lib/auth/`
- `src/lib/security/`
- `src/app/api/user/`
- `src/data/`
- `supabase/migrations/*profiles*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-ROLE-001** — New user can choose Vendor role and is routed to vendor onboarding/dashboard
  - Comments:
- [ ] **TC-ROLE-002** — New user can choose Customer role and is routed to customer dashboard
  - Comments:
- [ ] **TC-ROLE-003** — Role switching (if supported) preserves session and updates UI capabilities
  - Comments:
- [ ] **TC-ROLE-004** — Admin role is never self-assignable via client; requires server-side assignment
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-VONB-007 — Vendor Onboarding
**Code Scope**
- `src/app/vendor/onboarding/`
- `src/app/api/vendor/`
- `src/lib/services/*vendor*`
- `src/lib/database/`
- `src/components/*vendor*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-VONB-001** — Vendor can complete onboarding wizard and required fields persist
  - Comments:
- [ ] **TC-VONB-002** — Vendor onboarding validates required fields and shows inline errors
  - Comments:
- [ ] **TC-VONB-003** — Onboarding completion unlocks vendor dashboard navigation
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-BILL-008 — Vendor Subscriptions (Scheduling Gate)
**Code Scope**
- `supabase/migrations/20251224205800_vendor_subscriptions.sql`
- `supabase/migrations/20251224213758_vendor_subscriptions_scheduling_gate.sql`
- `src/lib/services/stripe.ts`
- `src/lib/stripe.ts`
- `src/app/api/stripe/`
- `src/app/api/webhooks/stripe/`
- `src/app/api/billing/`
- `src/components/SubscriptionManager.tsx`
- `src/app/vendor/dashboard/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-SUBS-001** — Vendor without active subscription is blocked from scheduling pages and scheduling mutations
  - Comments:
- [ ] **TC-SUBS-002** — Active subscription enables scheduling features (UI + API)
  - Comments:
- [ ] **TC-SUBS-003** — Stripe webhook updates subscription status in Supabase (active→past_due→canceled)
  - Comments:
- [ ] **TC-SUBS-004** — Webhook replay is idempotent (no duplicates; status remains stable)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-VSCHED-009 — Vendor Scheduling (Availability + Calendar Views)
**Code Scope**
- `src/app/vendor/schedule/`
- `src/app/vendor/calendar/`
- `src/app/api/vendor/schedule/`
- `src/app/api/availability/`
- `src/app/api/calendar/`
- `src/lib/bookingService.ts`
- `src/lib/bookingEngine.ts`
- `src/lib/services/bookingStateMachine.ts`
- `src/components/*Calendar*`
- `src/components/*Availability*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-VSCHED-001** — Vendor can create availability slots; slots appear in schedule/calendar views
  - Comments:
- [ ] **TC-VSCHED-002** — Vendor can edit/delete slots; changes reflected in search & calendar
  - Comments:
- [ ] **TC-VSCHED-003** — Availability search returns only non-expired, non-booked slots
  - Comments:
- [ ] **TC-VSCHED-004** — ICS export (if available) downloads and matches vendor schedule
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-BOOK-010 — Booking Flow (Create → Confirm)
**Code Scope**
- `src/app/book/`
- `src/app/confirm/`
- `src/app/api/bookings/`
- `src/lib/bookingsCreateHandler.ts`
- `src/lib/bookingEngine.ts`
- `src/lib/services/bookingWorker.ts`
- `src/lib/services/bookingStateMachine.ts`
- `src/contracts/`
- `api/openapi.yml`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-BOOK-001** — Customer selects a slot and creates a booking; booking is stored and visible to vendor
  - Comments:
- [ ] **TC-BOOK-002** — Confirm page shows correct booking details and status transitions correctly
  - Comments:
- [ ] **TC-BOOK-003** — Duplicate submission protection: refresh/retry does not create duplicate bookings
  - Comments:
- [ ] **TC-BOOK-004** — OpenAPI/contract behavior: API returns consistent error envelope on invalid input
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-BLIFE-011 — Booking Lifecycle (Cancel / Reschedule / Rebook)
**Code Scope**
- `src/lib/bookingsCancelHandler.ts`
- `src/components/ResilientRescheduleButton.tsx`
- `src/app/api/bookings/`
- `src/app/api/(dev)/test/bookings/`
- `src/app/vendor/requests/`
- `src/app/customer/bookings/`
- `src/lib/cli/bookingRollback.ts`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-BLIFE-001** — Vendor cancels booking; customer sees cancellation; slot handling matches policy
  - Comments:
- [ ] **TC-BLIFE-002** — Reschedule flow updates booking once and notifies both parties
  - Comments:
- [ ] **TC-BLIFE-003** — Rebook flow creates a new booking linked to original (if supported) without corrupting original record
  - Comments:
- [ ] **TC-BLIFE-004** — Rollback tooling (if present) does not violate data integrity / RLS
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-DISC-012 — Discovery & Search (Availability Search / Vendor Listing)
**Code Scope**
- `src/app/`
- `src/components/ProviderMap.tsx`
- `src/components/MapAbstraction*.tsx`
- `src/app/api/search/`
- `src/app/api/availability/search/`
- `src/app/api/service-requests/`
- `src/components/*Search*`
- `src/data/*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-DISC-001** — Search by service/location returns relevant vendors or slots (no errors)
  - Comments:
- [ ] **TC-DISC-002** — Privacy constraint: vendor precise location is not exposed in UI or API responses
  - Comments:
- [ ] **TC-DISC-003** — Empty result states are graceful and suggest next steps
  - Comments:
- [ ] **TC-DISC-004** — Search endpoints enforce rate limiting and input validation
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-REQ-013 — Service Requests & Broadcasts
**Code Scope**
- `src/app/requests/`
- `src/app/vendor/requests/`
- `src/app/api/service-requests/`
- `src/app/admin/broadcasts/`
- `src/app/api/admin/broadcasts/`
- `src/lib/notifications/intentDispatcher.ts`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-REQ-001** — Customer can create a service request; it is stored and acknowledged
  - Comments:
- [ ] **TC-REQ-002** — Vendor can view/respond to relevant requests (filtering works)
  - Comments:
- [ ] **TC-REQ-003** — Admin broadcast notify endpoint sends notifications to targeted cohort (dry-run acceptable)
  - Comments:
- [ ] **TC-REQ-004** — Spam control: repeated identical requests are throttled or deduped per policy
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-MAP-014 — Maps & Privacy Abstraction
**Code Scope**
- `src/components/MapAbstraction.tsx`
- `src/components/MapAbstractionAI.tsx`
- `src/components/ProviderMap.tsx`
- `src/components/maps/`
- `src/types/maps.ts`
- `src/app/api/ai-radius-scaling/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-MAP-001** — Map renders for discovery without exposing exact vendor address/coordinates
  - Comments:
- [ ] **TC-MAP-002** — Radius scaling/abstraction behaves consistently at different zoom levels
  - Comments:
- [ ] **TC-MAP-003** — Map provider adapter switch (Leaflet/Mapbox) does not break core map interactions
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-PAY-015 — Payments / Commitment Fee (if enabled in build)
**Code Scope**
- `src/app/pay/`
- `src/components/StripePayment.tsx`
- `src/lib/stripe.ts`
- `supabase/migrations/0001_payments_outbox.sql`
- `src/app/api/billing/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-PAY-001** — Pay page loads with correct amount/currency and handles success/cancel states
  - Comments:
- [ ] **TC-PAY-002** — Payment outbox records are created exactly once per payment attempt
  - Comments:
- [ ] **TC-PAY-003** — Booking flow does not proceed to 'confirmed' unless payment policy is satisfied (if applicable)
  - Comments:
- [ ] **TC-PAY-004** — No marketplace behavior: payments are never routed vendor↔customer (SaaS-only constraint)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-NOTIF-016 — Notifications (Email/SMS/Web Push) + Idempotency
**Code Scope**
- `src/lib/notifications/`
- `src/app/api/notifications/`
- `src/app/api/push/`
- `src/notifications/contracts/`
- `src/app/api/notify/`
- `src/app/api/admin/broadcasts/notify/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-NOTIF-001** — Booking confirmation triggers notifications to both parties (channel policy respected)
  - Comments:
- [ ] **TC-NOTIF-002** — Idempotency: repeated triggers do not spam; batched notifications dedupe correctly
  - Comments:
- [ ] **TC-NOTIF-003** — Web push subscribe/unsubscribe works and stores preferences safely
  - Comments:
- [ ] **TC-NOTIF-004** — Notification failures are captured (DLQ/log) without breaking booking flow
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-RATE-017 — Ratings & Reviews (Post-booking Reputation)
**Code Scope**
- `src/app/ratings/`
- `src/lib/ratings/`
- `src/app/api/reviews/`
- `src/app/admin/reviews/`
- `src/components/*Rating*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-RATE-001** — Customer can submit a rating only for completed/eligible bookings
  - Comments:
- [ ] **TC-RATE-002** — Rating UI supports halves (if implemented) and stores correct value
  - Comments:
- [ ] **TC-RATE-003** — Vendor rating aggregates update correctly and display on profile/listing
  - Comments:
- [ ] **TC-RATE-004** — Abuse controls: repeated ratings edits are blocked or audited per policy
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-I18N-018 — Internationalization (i18n) & Locale Completeness
**Code Scope**
- `src/lib/i18n/`
- `src/locales/`
- `src/middleware/`
- `src/app/**`
- `src/components/**`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-I18N-001** — Locale switch changes UI strings and preserves route/state
  - Comments:
- [ ] **TC-I18N-002** — Missing translation key handling: shows safe fallback, does not crash
  - Comments:
- [ ] **TC-I18N-003** — Date/time formatting respects locale and timezone
  - Comments:
- [ ] **TC-I18N-004** — Critical booking/vendor flows are translated for all supported locales
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-TOUR-019 — Guided Tours & Smart Tooltips
**Code Scope**
- `src/tours/`
- `src/app/**`
- `src/components/**tour*`
- `src/components/**Tooltip*`
- `src/hooks/**tour*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-TOUR-001** — Tours can be started/replayed; progress is saved and resumes correctly
  - Comments:
- [ ] **TC-TOUR-002** — Tours do not block critical actions; can be dismissed at any time
  - Comments:
- [ ] **TC-TOUR-003** — Tooltips render contextually and do not overlap/cover primary CTAs on mobile
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-HELP-020 — Help Center + Knowledge Base (RAG)
**Code Scope**
- `src/app/help/`
- `src/lib/kb/`
- `src/app/api/kb/`
- `supabase/migrations/2025010*_kb_*.sql`
- `src/app/api/admin/kb/`
- `src/app/api/cron/kb-*`
- `src/app/admin/unanswered/`
- `src/app/admin/suggestions/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-HELP-001** — Help Center pages load and list articles; links work
  - Comments:
- [ ] **TC-HELP-002** — KB search returns relevant articles; includes URL/title/snippet
  - Comments:
- [ ] **TC-HELP-003** — RAG answer endpoint returns grounded response with citations/links policy
  - Comments:
- [ ] **TC-HELP-004** — Crawler/vectorize jobs run (manual trigger) and update KB tables without duplication
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-TICK-021 — Support Tickets (Customer → Admin)
**Code Scope**
- `src/lib/tickets/`
- `src/app/api/support/tickets/`
- `src/app/admin/support/`
- `supabase/migrations/*support*`
- `src/app/api/v1/support/tickets*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-TICK-001** — Customer can create a support ticket; ticket persists and is listable
  - Comments:
- [ ] **TC-TICK-002** — Admin can view ticket details and update status/notes
  - Comments:
- [ ] **TC-TICK-003** — Ticket access control: customers can only read their own tickets
  - Comments:
- [ ] **TC-TICK-004** — Attachments/metadata (if supported) stored safely; no PII leaks in logs
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-ADMIN-022 — Admin Access Guard + Admin Shell
**Code Scope**
- `src/app/admin/`
- `src/lib/admin/`
- `src/middleware/`
- `src/lib/security/`
- `src/app/api/admin/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-ADMIN-001** — Non-admin users are blocked from /admin routes and admin APIs
  - Comments:
- [ ] **TC-ADMIN-002** — Admin dashboard loads and key nav sections work
  - Comments:
- [ ] **TC-ADMIN-003** — Admin actions are audited (where audit log exists)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-ADM-MGMT-023 — Admin Management (Vendors/Customers/Users/Service Types/Specialties)
**Code Scope**
- `src/app/admin/vendors/`
- `src/app/admin/customers/`
- `src/app/admin/users/`
- `src/app/admin/service-types/`
- `src/app/admin/specialties/`
- `src/app/api/admin/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-ADM-001** — Admin can list/search vendors, customers, and users
  - Comments:
- [ ] **TC-ADM-002** — Admin can view details and perform safe edits according to role policy
  - Comments:
- [ ] **TC-ADM-003** — Service types/specialties CRUD works and propagates to discovery UI
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-OPS-024 — Ops & Reliability (SLO, Performance, Resilience, Cache)
**Code Scope**
- `src/app/admin/slo/`
- `src/app/admin/performance/`
- `src/app/admin/resilience/`
- `src/app/admin/cache/`
- `src/app/api/ops/`
- `src/app/api/admin/cache/`
- `src/lib/performance/`
- `src/lib/observability/`
- `src/lib/alerting/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-OPS-001** — SLO endpoints respond and show expected shape for availability/booking metrics
  - Comments:
- [ ] **TC-OPS-002** — Performance dashboard loads without throwing and reflects recent metrics
  - Comments:
- [ ] **TC-OPS-003** — Cache clear/invalidate (admin) does not break app; respects permissions
  - Comments:
- [ ] **TC-OPS-004** — Incidents AI triage endpoint (if enabled) is admin-only and fails safely
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-ANALYTICS-025 — Analytics & Funnel Tracking
**Code Scope**
- `src/app/admin/analytics/`
- `src/app/api/analytics/`
- `src/lib/metrics/`
- `src/lib/telemetry/`
- `src/components/**Analytics*`
- `src/app/api/telemetry/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-AN-001** — Key funnel events are emitted for landing → search → booking → confirm
  - Comments:
- [ ] **TC-AN-002** — Analytics dashboard loads and filters without errors
  - Comments:
- [ ] **TC-AN-003** — PII safety: analytics payloads do not include secrets or full addresses
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-CRON-026 — Cron Jobs & Execution History
**Code Scope**
- `src/lib/cron/`
- `src/app/api/cron/`
- `supabase/migrations/20251224120334_cron_job_execution_history.sql`
- `src/app/admin/cron/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-CRON-001** — Cron endpoints execute successfully and record a history entry
  - Comments:
- [ ] **TC-CRON-002** — Cron failures are recorded with error details (without secrets)
  - Comments:
- [ ] **TC-CRON-003** — Admin cron page lists recent executions and supports basic filtering
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-TELEM-027 — Telemetry Stream (Ops Events) + Fusion Ops Bus
**Code Scope**
- `supabase/migrations/20251222230000_fusion_ops_bus.sql`
- `supabase/migrations/20251222240000_kb_crawler_fields.sql`
- `src/app/api/telemetry/`
- `src/lib/telemetry/`
- `src/lib/metrics/`
- `src/app/admin/operational-insights/`
- `src/app/api/ops/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-TELEM-001** — ops_events append-only behavior: events are recorded for key production actions (booking/availability changes)
  - Comments:
- [ ] **TC-TELEM-002** — Metrics RPC/view returns expected KPIs and does not error under empty data
  - Comments:
- [ ] **TC-TELEM-003** — Operational insights UI loads and streams/refreshes without crashing
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-SIMCITY-028 — SimCity Harness + Mission Control
**Code Scope**
- `chaos/`
- `src/simcity/`
- `src/lib/simcity/`
- `supabase/migrations/*simcity*`
- `src/app/admin/simcity/`
- `src/app/api/simcity/`
- `src/app/api/ops/simcity/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-SIM-001** — Start a SimCity run; run metadata is persisted; UI shows running state
  - Comments:
- [ ] **TC-SIM-002** — Events are emitted to simcity_run_events; snapshots appear periodically
  - Comments:
- [ ] **TC-SIM-003** — Harness failure does not take down the app; run ends with truthful result flags
  - Comments:
- [ ] **TC-SIM-004** — Mission control can fetch events and render live telemetry
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-OPSAI-029 — OpsAI Control Plane (Agents + Event Views)
**Code Scope**
- `src/app/admin/ops-ai/`
- `src/opsai/`
- `src/app/api/ops/incidents/ai-triage/`
- `src/app/api/ai-persona/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-OPSAI-001** — OpsAI pages load for admin only; non-admin blocked
  - Comments:
- [ ] **TC-OPSAI-002** — Agent endpoints (health/metrics/logs/regression) respond and fail safely
  - Comments:
- [ ] **TC-OPSAI-003** — OpsAI event viewer renders recent ops events without leaking secrets
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-SEC-030 — Security (Rate Limiting, RLS, CSP, Audit Logs)
**Code Scope**
- `src/lib/security/`
- `src/middleware/`
- `src/audit/`
- `supabase/migrations/0002_audit_and_access_logs.sql`
- `supabase/migrations/20251223140141_fix_rate_limit_and_support_tickets.sql`
- `src/app/api/validate-access/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-SEC-001** — Rate limiting: repeated requests to public endpoints return 429 per policy
  - Comments:
- [ ] **TC-SEC-002** — RLS: vendor/customer cannot read other users’ rows for bookings/tickets/subscriptions
  - Comments:
- [ ] **TC-SEC-003** — CSP/security headers present on public pages; no inline script violations (as configured)
  - Comments:
- [ ] **TC-SEC-004** — Audit/access log captures sensitive admin actions (where implemented)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-ADS-031 — Ads/AdSense Toggle (if enabled)
**Code Scope**
- `src/lib/adsense.ts`
- `src/types/nextjs-google-adsense.d.ts`
- `src/app/**`
- `src/components/**ads*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-ADS-001** — Default: ads are OFF globally (no AdSense scripts injected)
  - Comments:
- [ ] **TC-ADS-002** — When ads flag ON (non-prod), scripts load once and do not break page performance
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

---

## FEAT-DEPLOY-033 — Build & Deployment (Vercel/Supabase Functions Build Fix)
**Code Scope**
- `scripts/build-without-supabase-functions.js`
- `.vercelignore`
- `tsconfig.json`
- `docs/deployment/`
- `Dockerfile`
- `README.md`
- `CI_CD_SETUP_COMPLETE.md`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-DEP-001** — `pnpm build` succeeds locally with Supabase functions present
  - Comments:
- [ ] **TC-DEP-002** — Vercel build path succeeds (no Deno import conflicts)
  - Comments:
- [ ] **TC-DEP-003** — Env var validation: missing critical keys fails fast with clear error
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-VEND-034 — Vendor Dashboard (Overview, Bookings/Requests, Help)
**Code Scope**
- `src/app/vendor/dashboard/`
- `src/app/vendor/requests/`
- `src/app/vendor/help/`
- `src/app/api/vendor/`
- `src/components/*Vendor*`
- `src/lib/database/`
- `src/lib/bookingService.ts`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-VEND-001** — Vendor dashboard loads and shows key widgets (next bookings, requests, alerts)
  - Comments:
- [ ] **TC-VEND-002** — Vendor requests page lists active service requests relevant to the vendor
  - Comments:
- [ ] **TC-VEND-003** — Vendor help page links to Help Center/KB and opens support ticket creation (if enabled)
  - Comments:
- [ ] **TC-VEND-004** — Vendor routes are inaccessible to non-vendor roles (role gate)
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-CUST-035 — Customer Dashboard (Bookings, Favorites, Profile, Credits)
**Code Scope**
- `src/app/customer/dashboard/`
- `src/app/customer/bookings/`
- `src/app/customer/favorites/`
- `src/app/customer/profile/`
- `src/app/customer/credits/`
- `src/app/api/user/`
- `src/app/api/bookings/`
- `src/components/*Favorite*`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-CUST-001** — Customer dashboard loads and summarizes upcoming/past bookings
  - Comments:
- [ ] **TC-CUST-002** — Favorites: add/remove vendor from favorites and list updates correctly
  - Comments:
- [ ] **TC-CUST-003** — Customer profile edits persist and reflect across UI
  - Comments:
- [ ] **TC-CUST-004** — Credits page (if present) is read-only or gated per current launch policy
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>

---

## FEAT-SET-036 — User Settings (Preferences, Notifications, Locale)
**Code Scope**
- `src/app/settings/`
- `src/app/customer/dashboard/settings/`
- `src/app/api/notifications/preferences/`
- `src/app/api/user/`
- `src/lib/i18n/`
- `src/lib/notifications/`

**Code Rev:** `__________`  
**Invalidated On:** `YYYY-MM-DD`  
**Last Verified On:** `YYYY-MM-DD`

### Tests
- [ ] **TC-SET-001** — User can open settings and update preferences without errors
  - Comments:
- [ ] **TC-SET-002** — Notification preferences are saved and respected by notification dispatch
  - Comments:
- [ ] **TC-SET-003** — Locale preference persists and is applied on next visit/session
  - Comments:

### Invalidation Log (append-only)
- YYYY-MM-DD — invalidated (code changed in scope): <short note>




