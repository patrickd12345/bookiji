# API Guide

Bookiji exposes REST-style endpoints under the `/api` path. Use these endpoints to integrate custom clients or automation scripts.

## Base URL

- **Production:** `https://bookiji.com/api`
- **Local Development:** `http://localhost:3000/api`

## Authentication

Many endpoints require a valid session token from Supabase. Send it in the `Authorization` header:

```http
Authorization: Bearer <token>
```

Obtain tokens by signing up or authenticating through endpoints in `/api/auth`.

## Endpoints

### Authentication

- `GET /api/auth/google` – Begin Google OAuth flow
- `POST /api/auth/register` – Create a new account
- `GET /api/auth/check-admin` – Verify admin privileges

### User

- `GET /api/user/onboarding` – Fetch onboarding data
- `GET | POST | DELETE /api/user/roles` – Manage user roles (requires auth)

### Vendor

- `POST /api/vendor/register` – Register as a vendor
- `GET | POST /api/vendor/settings` – Update vendor settings
- `GET /api/vendor/service-types` – Available service categories
- `GET /api/vendor/analytics` – Vendor analytics

### Bookings

- `POST /api/bookings/create` – Create a booking
- `POST /api/bookings/cancel` – Cancel a booking
- `GET /api/bookings/user` – List bookings for the authenticated user

### Search & Availability

- `GET /api/search/providers` – Search providers (supports POST for AI suggestions)
- `POST /api/availability/generate` – Generate availability slots
- `POST /api/availability/search-paid` – Search availability (charges $1 fee)

### Payments

- `POST /api/payments/create-payment-intent` – Create Stripe payment intent
- `POST /api/payments/webhook` – Stripe webhook (server-to-server)
- `GET /api/payments/fees` – Get PPP-adjusted fees for currency

### Misc

- `POST /api/analytics/track` – Send analytics events

This list covers common routes. Explore the `src/app/api` directory for more examples.

### Support

- `POST /api/support/chat` – End-user chat entrypoint. Returns a KB answer when confidence is high, or escalates and creates a ticket when needed.
  - Body: `{ "message": string, "email?": string }`
  - Success (answer): `{ reply, intent, confidence, source: 'kb' }`
  - Success (escalation): `{ reply, escalated: true, ticketId }`

- `GET /api/v1/support/search?q=...` – Search KB (agent-only)
  - Auth: requires `support_agent` role. In local/dev you may use header `x-dev-agent: allow`.

- `GET /api/v1/support/digest?window=24h` – Summary counts for support KPIs (agent-only)

- `PATCH /api/v1/support/tickets/[id]` – Update ticket (e.g. `{ status: 'resolved' }`) (agent-only)
  - On `status: resolved`, the system generates a KB suggestion automatically (with fallbacks), visible under `kb_suggestions`.

- `GET /api/v1/support/tickets/[id]/messages` – List ticket conversation messages (agent-only)
- `POST /api/v1/support/tickets/[id]/messages` – Add an agent message
  - Body: `{ text: string, public?: boolean, sendEmail?: boolean }`
  - Rate limit: 10 messages/minute/agent

- `GET /api/v1/support/kb/suggestions?status=pending|approved|rejected|duplicate` – List suggestions (agent-only)
- `PATCH /api/v1/support/kb/suggestions/[id]` – Approve, reject, or link a suggestion
  - Body: `{ action: 'approve' | 'reject' | 'link', articleId?: string }`

Dev helpers (local only):
- `POST /api/test/support/seed_kb` – Seed KB with a canonical reschedule policy
- `GET /api/test/support/list_suggestions?ticket=[id]&status=[status]` – Inspect suggestions

## Rate Limits

API calls are limited to **60 requests per minute per IP**. Exceeding this limit returns `429 Too Many Requests`.
