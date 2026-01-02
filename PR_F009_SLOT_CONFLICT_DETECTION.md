# PR: F-009 Slot Conflict Detection

## Summary

Implements slot conflict detection for availability slots, preventing vendors from creating overlapping slots that could lead to double-bookings.

**Task:** F-009 (Vendor Scheduling MVP)  
**Type:** Feature  
**Priority:** Critical Path

## Changes

### Database Migration
- **File:** `supabase/migrations/20260116000000_add_slot_conflict_prevention.sql`
- Adds exclusion constraint using `btree_gist` to prevent overlapping time ranges per provider
- Adds `version` column for optimistic locking (future use)
- Creates `create_slot_atomically()` database function with conflict detection
- Adds performance indexes

### Library Code
- **`src/lib/availability/types.ts`** - Type definitions for conflicts
- **`src/lib/availability/conflictDetector.ts`** - Pure conflict detection logic
  - `classifyConflict()` - Classifies conflict types (full/partial/contained/contains)
  - `calculateOverlap()` - Calculates overlap time ranges
  - `validateSlotTimes()` - Validates slot time ranges
  - `detectConflictsFromResults()` - Processes database results into conflicts
- **`src/lib/availability/atomicSlotOperations.ts`** - Atomic slot operations
  - `createSlotAtomically()` - Creates slots with conflict detection
  - Integrates with database function
  - Handles errors and formats conflicts

### API Endpoint
- **`src/app/api/vendor/availability/route.ts`** - New endpoint
  - `POST /api/vendor/availability` - Creates availability slots
  - Returns 409 Conflict with details when overlaps detected
  - Returns 201 Created on success

### Tests
- **`tests/lib/availability/conflictDetector.spec.ts`** - Unit tests for conflict detector
  - Conflict type classification
  - Overlap calculation
  - Time validation
- **`tests/api/vendor/availability.spec.ts`** - API integration tests
  - Success cases
  - Conflict detection
  - Authentication/authorization
- **`tests/api/vendor/availability-concurrency.spec.ts`** - Concurrency tests
  - Concurrent slot creation prevention
  - Non-overlapping slots allowed
  - Different providers can have overlapping slots

## Design Summary

### Database Constraint Approach
- **Exclusion Constraint:** Uses PostgreSQL `EXCLUDE USING gist` with `tsrange` to prevent overlapping time ranges
- **Constraint Rule:** `provider_id WITH =, tsrange(start_time, end_time) WITH &&` WHERE `is_available = true`
- **Conflict Rules:**
  - Only checks overlaps for same `provider_id` (different providers can overlap)
  - Only checks `is_available = true` slots (unavailable slots don't conflict)
  - Uses `tsrange` overlap operator (`&&`) for efficient range queries

### Conflict Detection Flow
1. **Application Level:** `AtomicSlotOperations.createSlotAtomically()` calls database function
2. **Database Function:** `create_slot_atomically()` checks for conflicts before insert
3. **Database Constraint:** Exclusion constraint catches any missed conflicts (safety net)
4. **Response:** Returns conflicts with details (slot IDs, times, conflict types)

### Conflict Types
- **full_overlap:** Exact time match
- **partial_overlap:** Slots partially overlap
- **contained:** New slot is inside existing slot
- **contains:** New slot wraps existing slot

## Proof

### 1. Database Constraint Enforcement
```sql
-- Test: Try to create overlapping slots
INSERT INTO availability_slots (provider_id, start_time, end_time, is_available)
VALUES ('provider-1', '2026-01-20T10:00:00Z', '2026-01-20T11:00:00Z', true);

-- This should fail:
INSERT INTO availability_slots (provider_id, start_time, end_time, is_available)
VALUES ('provider-1', '2026-01-20T10:30:00Z', '2026-01-20T11:30:00Z', true);
-- Error: exclusion_violation
```

### 2. Conflict Detection Function
```typescript
// Unit test proves classification works
const conflict = AvailabilityConflictDetector.classifyConflict(
  { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
  { start: new Date('2026-01-20T10:30:00Z'), end: new Date('2026-01-20T11:30:00Z') }
);
// Returns: 'partial_overlap'
```

### 3. API Behavior
```bash
# Create first slot
curl -X POST http://localhost:3000/api/vendor/availability \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"service_id": "svc-1", "start_time": "2026-01-20T10:00:00Z", "end_time": "2026-01-20T11:00:00Z"}'
# Returns: 201 Created

# Try overlapping slot
curl -X POST http://localhost:3000/api/vendor/availability \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"service_id": "svc-1", "start_time": "2026-01-20T10:30:00Z", "end_time": "2026-01-20T11:30:00Z"}'
# Returns: 409 Conflict with conflicts array
```

### 4. Concurrent Prevention
The exclusion constraint ensures that even if two requests arrive simultaneously:
- Only one will succeed (the first to commit)
- The second will fail with `exclusion_violation`
- Database transaction isolation prevents race conditions

### 5. Test Coverage
- ✅ Unit tests: Conflict classification, overlap calculation, validation
- ✅ Integration tests: API endpoint behavior, error responses
- ✅ Concurrency tests: Concurrent slot creation prevention

## Test Commands

```bash
# Run unit tests
pnpm vitest run tests/lib/availability/conflictDetector.spec.ts

# Run API integration tests
pnpm vitest run tests/api/vendor/availability.spec.ts

# Run concurrency tests (requires database)
pnpm vitest run tests/api/vendor/availability-concurrency.spec.ts

# Run all availability tests
pnpm vitest run tests/lib/availability/ tests/api/vendor/availability
```

## Expected Test Results

All tests should pass:
- ✅ Conflict detector unit tests (15+ test cases)
- ✅ API integration tests (5+ test cases)
- ✅ Concurrency tests (3+ test cases)

## Rollback Plan

If issues arise:
1. **Disable constraint:**
   ```sql
   ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS availability_slots_no_overlap;
   ```
2. **Remove function:**
   ```sql
   DROP FUNCTION IF EXISTS create_slot_atomically;
   ```
3. **Remove version column (optional):**
   ```sql
   ALTER TABLE availability_slots DROP COLUMN IF EXISTS version;
   ```

## Migration Safety

- ✅ Uses `IF NOT EXISTS` for idempotency
- ✅ Uses `DROP CONSTRAINT IF EXISTS` for safe rollback
- ✅ Does not modify existing data
- ✅ Adds indexes for performance (no blocking)

## Next Steps

After this PR:
- F-010: Atomic slot updates (uses same conflict detection)
- F-011: Recurring slot management (extends conflict detection)
- F-013: Conflict resolution UI (uses conflict details from API)
