# Scheduling proof status report

## What was fixed
- `/login` now renders immediately without awaiting auth/session logic; the page renders `LoginFormContent` inside a `Suspense` fallback so the response is synchronous and does not hang. Plain-mode bypass (`/login?plain=1`) was added in middleware to return minimal HTML for health checks with security headers.
- Middleware now adds security headers and a CSP nonce to all routes, rewrites the sched subdomain to `/sched`, rate-limits API routes (stricter on admin), blocks non-prod-only routes in production, preserves legacy cancel/reschedule redirects, and handles synthetic SimCity headers.
- `.env.e2e` is pointed at the restored hosted Supabase project with publishable/anon/service keys so E2E flows no longer target the unreachable localhost instance.
- Attempt history is captured in `certification-report-e2e-video.md`, logging curl verification of `/login` and the previous E2E attempt.

## Remaining blocker
- E2E seeding and the scheduling-proof Playwright run still fail because outbound connections to the hosted Supabase instance are blocked by the environment proxy (CONNECT 403/ENETUNREACH). Without seeding, the vendor and customer test accounts are absent, so the scheduling proof cannot execute or produce the required video.

## Next steps if network access is restored
1. Run `pnpm e2e:seed` to create the vendor/customer records in the hosted Supabase project.
2. Start the dev server with `npx dotenv-cli -e .env.e2e -- pnpm dev` and confirm `/login` responds immediately via `curl http://localhost:3000/login` (with `?plain=1` for middleware-only checks if desired).
3. Execute `E2E=true pnpm e2e:scheduling-proof` to capture the booking video. Expect: preflight passes → vendor logs in → slot visible → first booking succeeds → second booking is rejected → video artifact generated.
