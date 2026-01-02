# Test Plan: Vendor Availability Hardening

**Task ID:** F-007  
**Status:** In Progress  
**Created:** 2025-01-16  
**Dependencies:** F-001 (Requirements: Vendor availability hardening)

---

## Overview

This test plan covers comprehensive testing of vendor availability system hardening, including conflict detection, atomic updates, recurring slots, and block time functionality.

---

## Test Strategy

Following the 4-layer testing strategy:

1. **Layer 1: Unit Tests** - Pure business logic without external dependencies
2. **Layer 2: API E2E Tests** - Complete system enforcement of scheduling correctness
3. **Layer 3: UI E2E Tests** - User-visible behavior validation
4. **Layer 4: UI Crawl** - Surface coverage and regression prevention

---

## Test Scope

### Features to Test

1. **Slot Conflict Detection (F-009)**
   - Detect overlapping availability slots
   - Prevent double-booking scenarios
   - Handle concurrent slot creation

2. **Atomic Slot Updates (F-010)**
   - Ensure slot updates are atomic
   - Prevent race conditions
   - Verify database consistency

3. **Recurring Slot Management (F-011)**
   - Create recurring availability patterns
   - Handle recurrence rules (daily, weekly, monthly)
   - Update/delete recurring slots

4. **Block Time API (F-012)**
   - Block specific time slots
   - Unblock slots
   - Verify blocked slots are excluded from search

5. **Conflict Resolution UI (F-013)**
   - Display conflicts to vendors
   - Allow manual conflict resolution
   - Auto-resolve simple conflicts

---

## Layer 1: Unit Tests

### Test Files to Create

**`tests/lib/availabilityConflictDetector.spec.ts`**
- Test conflict detection logic
- Test edge cases (adjacent slots, exact overlaps)
- Test performance with large slot sets

**`tests/lib/recurringSlotManager.spec.ts`**
- Test recurrence rule parsing
- Test slot generation from rules
- Test timezone handling

**`tests/lib/atomicSlotUpdates.spec.ts`**
- Test atomic update logic
- Test rollback scenarios
- Test concurrent update handling

### Test Cases

#### Conflict Detection
- ✅ Detect overlapping slots for same vendor
- ✅ Detect slots that start during another slot
- ✅ Detect slots that end during another slot
- ✅ Handle edge case: slots with exact same start/end
- Handle edge case: adjacent slots (no gap, no overlap)
- ✅ Performance: Detect conflicts in 1000+ slots efficiently

#### Recurring Slots
- ✅ Generate daily recurring slots
- ✅ Generate weekly recurring slots
- ✅ Generate monthly recurring slots
- ✅ Handle timezone conversions
- ✅ Handle daylight saving time transitions
- ✅ Generate slots within date range only
- ✅ Skip blocked dates in recurring pattern

#### Atomic Updates
- ✅ Single slot update succeeds
- ✅ Multiple slot updates in transaction
- ✅ Rollback on error
- ✅ Concurrent update detection
- ✅ Optimistic locking behavior

---

## Layer 2: API E2E Tests

### Test Files to Create

**`tests/api/vendor/availability-hardening.spec.ts`**
- Test all availability API endpoints
- Test conflict detection at API level
- Test atomic operations via API
- Test block time API

### Test Cases

#### Slot Creation API
- ✅ Create single availability slot
- ✅ Create slot with conflict → returns 409
- ✅ Create slot with invalid time → returns 400
- ✅ Create slot with past time → returns 400
- ✅ Create slot without authentication → returns 401
- ✅ Create slot for another vendor → returns 403

#### Slot Update API
- ✅ Update slot successfully
- ✅ Update slot creates conflict → returns 409
- ✅ Update non-existent slot → returns 404
- ✅ Update slot atomically (no partial updates)

#### Recurring Slots API
- ✅ Create recurring slot pattern
- ✅ Update recurring slot pattern
- ✅ Delete recurring slot pattern
- ✅ Query recurring slots

#### Block Time API
- ✅ Block time slot successfully
- ✅ Blocked slot excluded from availability search
- ✅ Unblock time slot
- ✅ Block overlapping with existing slot → conflict

#### Conflict Resolution API
- ✅ Get conflicts for vendor
- ✅ Auto-resolve simple conflicts
- ✅ Manual conflict resolution
- ✅ Conflict resolution persists

---

## Layer 3: UI E2E Tests

### Test Files to Create

**`tests/e2e/vendor/availability-hardening.spec.ts`**
- Test vendor availability UI
- Test conflict resolution UI
- Test recurring slot creation UI

### Test Cases

#### Availability Management UI
- ✅ Vendor can create availability slot
- ✅ Vendor sees conflict warning when creating overlapping slot
- ✅ Vendor can resolve conflicts via UI
- ✅ Vendor can create recurring slots
- ✅ Vendor can block time slots
- ✅ Blocked slots show in UI with visual indicator

#### Conflict Resolution UI
- ✅ Conflicts displayed in conflict resolution dialog
- ✅ Vendor can choose resolution option
- ✅ Resolution applied and conflicts cleared
- ✅ UI updates reflect resolved conflicts

---

## Layer 4: UI Crawl

### Test Files to Create

**`tests/e2e/crawl/vendor-availability.spec.ts`**
- Ensure all availability pages render
- Ensure no crashes on availability pages
- Ensure error states handled gracefully

### Test Cases
- ✅ `/vendor/schedule` page renders
- ✅ `/vendor/schedule/create` page renders
- ✅ `/vendor/schedule/conflicts` page renders
- ✅ Error pages render correctly
- ✅ No JavaScript errors in console

---

## Performance Tests

### Load Testing
- ✅ Create 1000+ slots concurrently
- ✅ Detect conflicts in large slot set (< 1s)
- ✅ Update 100+ slots atomically
- ✅ Generate recurring slots for 1 year (< 5s)

---

## Security Tests

### Authorization
- ✅ Vendor can only manage own slots
- ✅ Non-vendor cannot access availability APIs
- ✅ Admin can view all vendor slots (if needed)

### Input Validation
- ✅ SQL injection attempts blocked
- ✅ XSS attempts in slot descriptions blocked
- ✅ Invalid date/time formats rejected
- ✅ Negative durations rejected

---

## Test Data Requirements

### Test Vendors
- Vendor with no slots
- Vendor with 100+ slots
- Vendor with recurring slots
- Vendor with blocked time

### Test Scenarios
- Single vendor, multiple slots
- Multiple vendors, overlapping time ranges
- Recurring patterns (daily, weekly, monthly)
- Timezone edge cases

---

## Success Criteria

### Unit Tests
- ✅ 100% code coverage for conflict detection
- ✅ 100% code coverage for recurring slot manager
- ✅ 100% code coverage for atomic updates
- ✅ All edge cases covered

### API Tests
- ✅ All API endpoints tested
- ✅ All error cases tested
- ✅ All success cases tested
- ✅ Performance requirements met

### UI Tests
- ✅ All user flows tested
- ✅ All UI components tested
- ✅ Accessibility requirements met

### Integration Tests
- ✅ End-to-end booking flow works with hardened availability
- ✅ No regressions in existing functionality

---

## Test Execution Plan

1. **Week 1:** Write unit tests (Layer 1)
2. **Week 2:** Write API tests (Layer 2)
3. **Week 3:** Write UI tests (Layer 3)
4. **Week 4:** Write crawl tests (Layer 4) + Performance tests

---

## Dependencies

- F-001: Requirements document must be complete
- F-004: Design document must be complete
- F-009: Slot conflict detection must be implemented
- F-010: Atomic slot updates must be implemented
- F-011: Recurring slot management must be implemented
- F-012: Block time API must be implemented
- F-013: Conflict resolution UI must be implemented

---

## Notes

- Tests should use existing test infrastructure (`tests/helpers/`, `tests/fixtures/`)
- Follow existing test patterns from `tests/lib/availabilityEngine.spec.ts`
- Use Vitest for unit tests, Playwright for E2E tests
- Mock external dependencies (calendar APIs, etc.)

---

**Last Updated:** 2025-01-16  
**Next Steps:** Review requirements (F-001) and design (F-004) documents before implementing tests
