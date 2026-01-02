# Design: Availability Conflict Resolution

**Task ID:** F-004  
**Status:** ✅ Complete  
**Created:** 2025-01-16  
**Duration:** 3 days  
**Target Date:** 2026-01-09  
**Dependencies:** F-001 (Requirements: Vendor availability hardening)

---

## Overview

This document provides the technical design for detecting and resolving availability slot conflicts, ensuring vendors cannot create overlapping slots that could lead to double-bookings.

---

## Design Principles

1. **Prevention First:** Detect conflicts before they occur
2. **Atomic Operations:** All conflict checks and slot operations are atomic
3. **Clear Feedback:** Vendors receive actionable conflict information
4. **Performance:** Conflict detection must be fast (< 100ms for 1000 slots)
5. **Consistency:** Database constraints enforce no overlaps

---

## Architecture

### Conflict Detection Layer

```
┌─────────────────────────────────────┐
│   API Endpoint                     │
│   POST /api/vendor/availability    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Conflict Detector                 │
│   availabilityConflictDetector.ts    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Database Query                     │
│   Check for overlapping slots       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Database Constraint                │
│   Exclusion constraint (btree_gist) │
└─────────────────────────────────────┘
```

---

## Database Design

### Schema Changes

#### 1. Add Exclusion Constraint

```sql
-- Enable btree_gist extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping slots
ALTER TABLE availability_slots
ADD CONSTRAINT availability_slots_no_overlap
EXCLUDE USING gist (
  vendor_id WITH =,
  tsrange(start_time, end_time) WITH &&
);
```

**Explanation:**
- `vendor_id WITH =` - Only check overlaps for same vendor
- `tsrange(start_time, end_time) WITH &&` - Prevent overlapping time ranges
- Uses GIST index for efficient range queries

#### 2. Add Version Column for Optimistic Locking

```sql
ALTER TABLE availability_slots
ADD COLUMN version INTEGER DEFAULT 1;

CREATE INDEX idx_availability_slots_version 
ON availability_slots(vendor_id, version);
```

#### 3. Add Conflict Tracking Table (Optional)

```sql
CREATE TABLE availability_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id),
  slot1_id UUID NOT NULL REFERENCES availability_slots(id),
  slot2_id UUID NOT NULL REFERENCES availability_slots(id),
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('full_overlap', 'partial_overlap', 'contained', 'contains')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT CHECK (resolution_action IN ('keep_existing', 'replace', 'merge', 'adjust')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_conflicts_vendor 
ON availability_conflicts(vendor_id, resolved_at);
```

---

## Conflict Detection Algorithm

### Algorithm: Detect Slot Conflicts

```typescript
interface SlotConflict {
  slot1: AvailabilitySlot;
  slot2: AvailabilitySlot;
  conflictType: 'full_overlap' | 'partial_overlap' | 'contained' | 'contains';
  overlapStart: string; // ISO 8601
  overlapEnd: string;   // ISO 8601
}

function detectConflicts(
  vendorId: string,
  newSlot: { startTime: string; endTime: string }
): Promise<SlotConflict[]> {
  // Query for overlapping slots using database
  // Use tsrange overlap operator (&&)
  const query = `
    SELECT id, start_time, end_time
    FROM availability_slots
    WHERE vendor_id = $1
      AND id != COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
      AND tsrange(start_time, end_time) && tsrange($3::timestamptz, $4::timestamptz)
      AND is_available = true
    ORDER BY start_time;
  `;
  
  // Classify conflict type
  // Return conflicts with details
}
```

### Conflict Type Classification

```typescript
function classifyConflict(
  newSlot: { start: Date; end: Date },
  existingSlot: { start: Date; end: Date }
): 'full_overlap' | 'partial_overlap' | 'contained' | 'contains' {
  if (newSlot.start >= existingSlot.start && newSlot.end <= existingSlot.end) {
    return 'contained'; // New slot is contained within existing
  }
  if (existingSlot.start >= newSlot.start && existingSlot.end <= newSlot.end) {
    return 'contains'; // New slot contains existing
  }
  if (newSlot.start < existingSlot.end && newSlot.end > existingSlot.start) {
    return 'partial_overlap'; // Partial overlap
  }
  // Note: Full overlap is same as contains/contained with exact match
  return 'full_overlap';
}
```

---

## Atomic Slot Operations

### Database Function: Create Slot Atomically

```sql
CREATE OR REPLACE FUNCTION create_slot_atomically(
  p_vendor_id UUID,
  p_service_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_recurrence_rule JSONB DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  slot_id UUID,
  error_message TEXT,
  conflicts JSONB
) AS $$
DECLARE
  v_slot_id UUID;
  v_conflicts JSONB;
BEGIN
  -- Check for conflicts
  SELECT jsonb_agg(jsonb_build_object(
    'slot_id', id,
    'start_time', start_time,
    'end_time', end_time,
    'conflict_type', 'overlap'
  )) INTO v_conflicts
  FROM availability_slots
  WHERE vendor_id = p_vendor_id
    AND tsrange(start_time, end_time) && tsrange(p_start_time, p_end_time)
    AND is_available = true;
  
  -- If conflicts exist, return them
  IF v_conflicts IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Conflicts detected'::TEXT, v_conflicts;
    RETURN;
  END IF;
  
  -- Create slot atomically
  INSERT INTO availability_slots (
    vendor_id, service_id, start_time, end_time, 
    recurrence_rule, is_available, version
  )
  VALUES (
    p_vendor_id, p_service_id, p_start_time, p_end_time,
    p_recurrence_rule, true, 1
  )
  RETURNING id INTO v_slot_id;
  
  RETURN QUERY SELECT true, v_slot_id, NULL::TEXT, NULL::JSONB;
EXCEPTION
  WHEN exclusion_violation THEN
    -- Database constraint caught overlap
    RETURN QUERY SELECT false, NULL::UUID, 'Slot overlap detected by database constraint'::TEXT, NULL::JSONB;
END;
$$ LANGUAGE plpgsql;
```

### Database Function: Update Slot Atomically

```sql
CREATE OR REPLACE FUNCTION update_slot_atomically(
  p_slot_id UUID,
  p_vendor_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_expected_version INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  conflicts JSONB
) AS $$
DECLARE
  v_current_version INTEGER;
  v_conflicts JSONB;
BEGIN
  -- Lock slot for update
  SELECT version INTO v_current_version
  FROM availability_slots
  WHERE id = p_slot_id AND vendor_id = p_vendor_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Slot not found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Optimistic locking check
  IF v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, 'Slot was modified by another operation'::TEXT, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check for conflicts (excluding current slot)
  SELECT jsonb_agg(jsonb_build_object(
    'slot_id', id,
    'start_time', start_time,
    'end_time', end_time
  )) INTO v_conflicts
  FROM availability_slots
  WHERE vendor_id = p_vendor_id
    AND id != p_slot_id
    AND tsrange(start_time, end_time) && tsrange(p_start_time, p_end_time)
    AND is_available = true;
  
  IF v_conflicts IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Conflicts detected'::TEXT, v_conflicts;
    RETURN;
  END IF;
  
  -- Update slot atomically
  UPDATE availability_slots
  SET start_time = p_start_time,
      end_time = p_end_time,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_slot_id;
  
  RETURN QUERY SELECT true, NULL::TEXT, NULL::JSONB;
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN QUERY SELECT false, 'Slot overlap detected'::TEXT, NULL::JSONB;
END;
$$ LANGUAGE plpgsql;
```

---

## Conflict Resolution Strategies

### Strategy 1: Keep Existing (Default)
- Discard new slot
- Keep existing slot unchanged
- Return 409 Conflict with existing slot details

### Strategy 2: Replace
- Delete existing slot
- Create new slot
- Atomic operation (both in transaction)

### Strategy 3: Adjust Times
- Modify new slot times to avoid overlap
- Keep both slots with adjusted times
- Requires vendor confirmation

### Strategy 4: Merge
- Combine overlapping slots into single slot
- Use earliest start, latest end
- Only if slots are for same service

---

## API Design

### Endpoint: Create Slot with Conflict Detection

```typescript
POST /api/vendor/availability
{
  "service_id": "uuid",
  "start_time": "2026-01-20T10:00:00Z",
  "end_time": "2026-01-20T11:00:00Z",
  "recurrence_rule": { ... } // optional
}

// Success Response (201)
{
  "success": true,
  "slot_id": "uuid",
  "slot": { ... }
}

// Conflict Response (409)
{
  "success": false,
  "error": "CONFLICT_DETECTED",
  "conflicts": [
    {
      "slot_id": "uuid",
      "start_time": "2026-01-20T10:30:00Z",
      "end_time": "2026-01-20T11:30:00Z",
      "conflict_type": "partial_overlap",
      "overlap_start": "2026-01-20T10:30:00Z",
      "overlap_end": "2026-01-20T11:00:00Z"
    }
  ],
  "resolution_options": ["keep_existing", "replace", "adjust", "merge"]
}
```

### Endpoint: Resolve Conflict

```typescript
POST /api/vendor/availability/resolve-conflict
{
  "conflict_id": "uuid", // optional
  "new_slot": { ... },
  "existing_slot_id": "uuid",
  "resolution_action": "replace" | "adjust" | "merge",
  "adjusted_times": { ... } // if adjust
}

// Success Response (200)
{
  "success": true,
  "resolved": true,
  "slot_id": "uuid"
}
```

---

## Implementation Details

### File Structure

```
src/lib/availability/
├── conflictDetector.ts       # Conflict detection logic
├── atomicSlotOperations.ts  # Atomic create/update/delete
├── conflictResolver.ts       # Conflict resolution strategies
└── types.ts                  # Type definitions

src/app/api/vendor/availability/
├── route.ts                  # Main endpoint (enhance)
├── conflicts/route.ts        # Get conflicts
└── resolve/route.ts          # Resolve conflicts
```

### Conflict Detector Implementation

```typescript
// src/lib/availability/conflictDetector.ts

export interface SlotConflict {
  slot1Id: string;
  slot2Id: string;
  conflictType: ConflictType;
  overlapStart: Date;
  overlapEnd: Date;
}

export class AvailabilityConflictDetector {
  async detectConflicts(
    vendorId: string,
    newSlot: { startTime: Date; endTime: Date },
    excludeSlotId?: string
  ): Promise<SlotConflict[]> {
    // Query database for overlapping slots
    // Use tsrange overlap operator
    // Classify conflict types
    // Return conflicts
  }
  
  async checkConflictsForRecurring(
    vendorId: string,
    pattern: RecurrenceRule,
    startDate: Date,
    endDate: Date
  ): Promise<SlotConflict[]> {
    // Generate slots from pattern
    // Check each generated slot for conflicts
    // Return all conflicts
  }
}
```

### Atomic Operations Implementation

```typescript
// src/lib/availability/atomicSlotOperations.ts

export class AtomicSlotOperations {
  async createSlotAtomically(
    vendorId: string,
    slot: CreateSlotRequest
  ): Promise<{ success: boolean; slotId?: string; conflicts?: SlotConflict[] }> {
    // Call database function create_slot_atomically
    // Handle conflicts
    // Return result
  }
  
  async updateSlotAtomically(
    slotId: string,
    vendorId: string,
    updates: UpdateSlotRequest,
    expectedVersion: number
  ): Promise<{ success: boolean; conflicts?: SlotConflict[] }> {
    // Call database function update_slot_atomically
    // Handle version mismatch
    // Handle conflicts
    // Return result
  }
}
```

---

## Performance Considerations

### Indexing Strategy

```sql
-- Primary index for conflict detection
CREATE INDEX idx_availability_slots_vendor_time 
ON availability_slots(vendor_id, start_time, end_time)
WHERE is_available = true;

-- GIST index for exclusion constraint (automatic with constraint)
-- Additional index for recurring pattern queries
CREATE INDEX idx_availability_slots_recurrence 
ON availability_slots(vendor_id, (recurrence_rule->>'frequency'))
WHERE recurrence_rule IS NOT NULL;
```

### Query Optimization

- Use `tsrange` for efficient time range queries
- Filter by `is_available = true` to reduce scan size
- Use covering indexes where possible
- Limit conflict check to relevant time window

### Caching Strategy

- Cache conflict-free slots for short duration (5 minutes)
- Invalidate cache on slot create/update/delete
- Use Redis for distributed caching (if needed)

---

## Error Handling

### Conflict Detection Errors

```typescript
enum ConflictError {
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  MULTIPLE_CONFLICTS = 'MULTIPLE_CONFLICTS',
  RECURRING_CONFLICT = 'RECURRING_CONFLICT',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION'
}
```

### Error Response Format

```typescript
{
  "error": "CONFLICT_DETECTED",
  "message": "Slot conflicts with existing availability",
  "conflicts": [...],
  "resolution_options": [...],
  "suggested_resolution": "adjust" // optional
}
```

---

## Testing Strategy

### Unit Tests
- Conflict detection algorithm
- Conflict type classification
- Atomic operation logic
- Edge cases (adjacent slots, exact matches)

### Integration Tests
- Database function tests
- API endpoint tests
- Concurrent operation tests
- Performance tests (1000+ slots)

### E2E Tests
- Vendor creates conflicting slot → sees error
- Vendor resolves conflict → slot created
- Vendor updates slot → conflict detected
- Concurrent slot creation → only one succeeds

---

## Migration Plan

### Phase 1: Add Database Constraints
1. Add exclusion constraint
2. Add version column
3. Add indexes
4. Test constraint enforcement

### Phase 2: Implement Conflict Detection
1. Create conflict detector library
2. Add conflict detection to API endpoints
3. Return conflict details in responses
4. Test conflict detection

### Phase 3: Implement Resolution
1. Create conflict resolver
2. Add resolution API endpoint
3. Build resolution UI
4. Test resolution flows

---

## Rollback Plan

If issues arise:
1. Disable conflict detection (feature flag)
2. Remove exclusion constraint (if causing issues)
3. Fall back to application-level checks only
4. Monitor for double-bookings manually

---

## Success Criteria

- ✅ Zero overlapping slots in production
- ✅ < 100ms conflict detection time
- ✅ 100% conflict detection accuracy
- ✅ Clear error messages for vendors
- ✅ Successful conflict resolution rate > 95%

---

## References

- Requirements: `docs/requirements/vendor-availability-hardening.md`
- Existing atomic operations: `supabase/migrations/20251222160000_atomic_booking_claim.sql`
- Invariants: `docs/invariants/availability-slots.md`

---

**Last Updated:** 2025-01-16  
**Next Steps:** Build phase (F-009) - Implement slot conflict detection
