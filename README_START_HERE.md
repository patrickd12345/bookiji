# Bookiji Starter Commit (Live Debate → Code)

This bundle turns the debate into runnable bones:
- `api/openapi.yml` — contract-first endpoints.
- `docs/error_envelope.md` — consistent error/success shape.
- `supabase/migrations/0001_*.sql` — `payments_outbox`, `payments_dlq`.
- `supabase/migrations/0002_*.sql` — `audit_log`, `access_log`.
- `app/api/*/route.ts` — Next.js 15 route skeletons.
- `scripts/simcity/run.py` — simulator entrypoint.
- `tests/e2e/booking.spec.ts` — Playwright sketch.
- `scripts/bkctl.sh` — rollback stub.

## Quickstart
1. Run SQL migrations in Supabase.
2. Start Next.js and hit the endpoints.
3. Wire Playwright to your dev server and run `booking.spec.ts`.
4. Replace TODOs with your domain services & Stripe logic.
