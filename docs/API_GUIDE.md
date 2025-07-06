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

### Misc

- `POST /api/analytics/track` – Send analytics events

This list covers common routes. Explore the `src/app/api` directory for more examples.

## Rate Limits

API calls are limited to **60 requests per minute per IP**. Exceeding this limit returns `429 Too Many Requests`.
