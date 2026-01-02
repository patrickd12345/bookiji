# Design-to-Code Reconciliation

## Global Rule

**Do not fork parallel systems.** Existing production code is authoritative. Reuse existing tables, columns, and interfaces. Extend where needed, never duplicate.

---

## 1. Table Naming

**Design Reference:** `calendar_sync_status`, `calendar_events`  
**Codebase Reality:** `external_calendar_connections` (used in `src/app/api/auth/google/callback/route.ts`, `src/lib/calendar-adapters/google.ts`)

**Resolution:** Reuse `external_calendar_connections` table. Do not create `calendar_sync_status` or `calendar_events`.

**Rationale:** The codebase already references `external_calendar_connections` in production code paths. Creating parallel tables would require duplicating connection logic, migration complexity, and maintenance burden. The existing table structure can be extended with additional columns if needed (e.g., `last_sync_at`, `sync_status`) rather than creating new tables.

**Implementation:** If `external_calendar_connections` table does not exist in migrations, create it with schema aligned to `ExternalCalendarConfig` interface in `src/lib/calendar-adapters/types.ts`. For event mapping, store `google_calendar_event_id` directly on `bookings` table (add column if missing) rather than creating a separate `calendar_events` table.

---

## 2. Column Naming

**Design Reference:** `vendor_id`  
**Codebase Invariant:** `provider_id` (used throughout `supabase/migrations/20250819190000_complete_database_schema.sql` and all subsequent migrations)

**Resolution:** Standardize on `provider_id` everywhere. All new code, migrations, and design documents must use `provider_id`.

**Rationale:** The database schema consistently uses `provider_id` as the foreign key to `profiles(id)` across all tables (`services`, `availability_slots`, `bookings`, `reviews`, `provider_locations`, etc.). Using `vendor_id` would violate the established naming convention and require either schema changes (breaking) or mapping layers (unnecessary complexity).

**Implementation:** Any design document references to `vendor_id` should be interpreted as `provider_id` during implementation. Update design documents to use `provider_id` for consistency.

---

## 3. Token Storage

**Design Specification:** Encrypted OAuth tokens (`oauth_token_encrypted`, `oauth_refresh_token_encrypted`)  
**Codebase Reality:** Plaintext tokens stored in `access_token`, `refresh_token` columns (see `src/app/api/auth/google/callback/route.ts`)

**Resolution:** Keep existing plaintext storage. Defer encryption hardening to a future PR.

**Rationale:** Encryption at rest is a security hardening measure, not a functional requirement. The current implementation works for MVP. Adding encryption requires:
- Migration to encrypt existing tokens
- Encryption/decryption utilities
- Key management infrastructure
- Testing for token refresh flows with encrypted storage

This is a non-breaking enhancement that can be implemented independently without affecting calendar sync functionality.

**Implementation:** Continue storing tokens as plaintext in `external_calendar_connections.access_token` and `external_calendar_connections.refresh_token`. Document encryption as a future enhancement in the PR description.

---

## 4. Adapter Interface

**Design Proposal:** New `CalendarAdapter` interface with methods: `connect(credentials)`, `disconnect(vendorId)`, `getConnectionStatus(vendorId)`, `getFreeBusy(vendorId, ...)`, `createEvent(vendorId, ...)`, `updateEvent(vendorId, ...)`, `deleteEvent(vendorId, ...)`, `syncFreeBusy(vendorId)`  
**Codebase Reality:** Existing `CalendarAdapter` interface in `src/lib/calendar-adapters/types.ts` with methods: `connect(code, email?)`, `disconnect(connectionId)`, `refreshToken(connectionId)`, `getCalendarList()`, `getEvents(start, end)`, `getFreebusy(start, end)`, optional `createEvent?`, `updateEvent?`, `deleteEvent?`

**Resolution:** Extend the existing `CalendarAdapter` interface. Do not introduce a parallel abstraction.

**Rationale:** The codebase already has a working adapter pattern implemented by `GoogleCalendarAdapter` in `src/lib/calendar-adapters/google.ts`. The design's proposed interface differs in method signatures (e.g., `vendorId` vs `connectionId`, different parameter patterns). Extending the existing interface maintains backward compatibility and reuses established patterns.

**Implementation:**
- Add optional write methods (`createEvent`, `updateEvent`, `deleteEvent`) to the existing interface if not already present
- Implement these methods in `GoogleCalendarAdapter` 
- Use `connectionId` (from `external_calendar_connections.id`) rather than `vendorId`/`providerId` for adapter operations, as the adapter layer operates on connections, not providers directly
- If design requires `provider_id`-based lookups, add a helper function that resolves `provider_id` → `connectionId` before calling adapter methods

---

## PR Requirements

The PR description must explicitly state:

1. **Table Reuse:** This PR extends `external_calendar_connections` table (or creates it if missing). It does not create `calendar_sync_status` or `calendar_events` tables.

2. **Naming Convention:** All database columns use `provider_id` (not `vendor_id`) to reference `profiles(id)`, consistent with existing schema.

3. **Token Storage:** OAuth tokens are stored as plaintext. Encryption at rest is deferred to a future security hardening PR.

4. **Adapter Extension:** This PR extends the existing `CalendarAdapter` interface in `src/lib/calendar-adapters/types.ts` and implements new methods in `GoogleCalendarAdapter`. It does not create a parallel adapter abstraction.

5. **Migration Impact:** If `external_calendar_connections` table is missing, the migration creates it. If it exists, the migration adds any missing columns needed for 2-way sync (e.g., `last_sync_at`, `sync_status`). The migration is idempotent and non-breaking.

6. **Backward Compatibility:** All existing calendar sync code continues to work. New write operations (create/update/delete events) are additive only.
