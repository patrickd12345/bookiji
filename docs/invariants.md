## Slot exclusivity

**Rule**  
No availability slot may be claimed by more than one booking and slots flip to unavailable once an active booking touches them.

**Enforced by**  
- `supabase/migrations/20251222190000_enforce_slot_consistency.sql:10-59` (unique constraint `availability_slots_provider_time_key` plus `sync_booking_slot_availability` trigger keeps slot rows unique and toggles `is_available`).  

**Proven by**  
- `tests/e2e/scheduling-proof.spec.ts:133-215` (Scheduling Proof test books a slot, then the duplicate attempt must be rejected by the system).

## Booking authentication gate

**Rule**  
Every call to `POST /api/bookings/create` must return HTTP 401 unless Supabase reports an authenticated user.

**Enforced by**  
- `src/app/api/bookings/create/route.ts:33-52` (Supabase `auth.getUser()` is required and unauthorized requests are immediately rejected with 401).

**Proven by**  
- `tests/api/contracts/bookings.spec.ts:40-60` (`POST /api/bookings/create requires authentication` contract test exercises the 401 response).

## No past bookings

**Rule**  
Booking start times must be strictly in the future; past values are rejected before persisting any booking.

**Enforced by**  
- `src/app/api/bookings/create/route.ts:67-84` (route handler validates `startTime` against `now()` and returns 400 when the input is stale).  
- `supabase/migrations/20251225150656_enforce_no_past_booking.sql:12-38` (the `claim_slot_and_create_booking` function enforces the same rule inside the atomic transaction).

**Proven by**  
- `tests/api/bookings.create.spec.ts:101-128` (unit test hits the route with a past slot and verifies the 400 response).
