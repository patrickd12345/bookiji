# Requirements: Vendor Availability Hardening

**Task ID:** F-001  
**Status:** ✅ Complete  
**Created:** 2025-01-16  
**Duration:** 2 days  
**Target Date:** 2026-01-06

---

## Overview

This document defines requirements for hardening the vendor availability system to prevent conflicts, ensure data consistency, and support advanced scheduling features like recurring slots and time blocking.

---

## Business Requirements

### BR-001: Prevent Double-Booking
**Priority:** 🔴 CRITICAL

Vendors must never have overlapping availability slots that could result in double-bookings.

**Acceptance Criteria:**
- System detects overlapping slots for the same vendor
- System prevents creation of conflicting slots
- System provides clear error messages when conflicts are detected
- Existing bookings are protected from slot modifications that would create conflicts

### BR-002: Atomic Slot Operations
**Priority:** 🔴 CRITICAL

All slot operations (create, update, delete) must be atomic to prevent race conditions and data corruption.

**Acceptance Criteria:**
- Slot creation is atomic (all-or-nothing)
- Slot updates are atomic (no partial updates)
- Slot deletions are atomic
- Concurrent operations are handled correctly
- Database transactions ensure consistency

### BR-003: Recurring Slot Management
**Priority:** 🟡 HIGH

Vendors must be able to create recurring availability patterns (daily, weekly, monthly) without manually creating each slot.

**Acceptance Criteria:**
- Vendors can create recurring slot patterns
- Recurring patterns support: daily, weekly, monthly
- Recurring slots respect business hours
- Recurring slots respect blocked dates
- Vendors can update/delete entire recurring patterns
- Individual occurrences can be modified without affecting the pattern

### BR-004: Block Time Functionality
**Priority:** 🟡 HIGH

Vendors must be able to block specific time periods (e.g., lunch break, personal time) that should not be available for booking.

**Acceptance Criteria:**
- Vendors can block specific time slots
- Blocked slots are excluded from availability search
- Blocked slots can be unblocked
- Blocked slots can be recurring (e.g., "block lunch every day")
- Blocked slots override availability slots

### BR-005: Conflict Resolution
**Priority:** 🟡 HIGH

When conflicts are detected, vendors must be able to resolve them through a clear, user-friendly interface.

**Acceptance Criteria:**
- System displays all conflicts to vendors
- Vendors can see conflicting slots side-by-side
- Vendors can choose resolution: keep existing, replace with new, or merge
- System provides recommendations for conflict resolution
- Resolution actions are logged for audit

---

## Functional Requirements

### FR-001: Slot Conflict Detection

**Description:** System must detect when availability slots overlap for the same vendor.

**Requirements:**
1. **Detection Algorithm**
   - Check for time overlaps: `slot1.start < slot2.end && slot1.end > slot2.start`
   - Check for same vendor ID
   - Check for same service (if applicable)
   - Handle edge cases: adjacent slots, exact matches

2. **Conflict Types**
   - **Full Overlap:** New slot completely overlaps existing slot
   - **Partial Overlap:** New slot partially overlaps existing slot
   - **Contained:** New slot is contained within existing slot
   - **Contains:** New slot contains existing slot

3. **Conflict Detection Timing**
   - On slot creation
   - On slot update
   - On recurring pattern creation
   - On bulk operations

4. **Conflict Response**
   - Return 409 Conflict status code
   - Include conflict details in response
   - List all conflicting slots
   - Suggest resolution options

### FR-002: Atomic Slot Updates

**Description:** All slot operations must be atomic and transaction-safe.

**Requirements:**
1. **Database Transactions**
   - Use database transactions for multi-step operations
   - Rollback on any error
   - Ensure ACID compliance

2. **Optimistic Locking**
   - Use version numbers or timestamps
   - Detect concurrent modifications
   - Return 409 Conflict if version mismatch

3. **Idempotency**
   - Support idempotency keys
   - Prevent duplicate operations
   - Return same result for duplicate requests

4. **Concurrent Operation Handling**
   - Use database locks where necessary
   - Handle race conditions gracefully
   - Prevent lost updates

### FR-003: Recurring Slot Patterns

**Description:** Support for recurring availability patterns.

**Requirements:**
1. **Recurrence Rules**
   - **Daily:** Every N days
   - **Weekly:** Specific days of week
   - **Monthly:** Specific day of month or day of week
   - **Custom:** Complex patterns (e.g., "first Monday of month")

2. **Pattern Storage**
   - Store recurrence rule in `availability_slots.recurrence_rule` (JSONB)
   - Store pattern metadata (start date, end date, exceptions)
   - Link individual slots to parent pattern

3. **Slot Generation**
   - Generate slots from pattern on-demand or pre-generate
   - Respect business hours when generating
   - Skip blocked dates
   - Handle timezone conversions

4. **Pattern Management**
   - Update pattern → update all future occurrences
   - Delete pattern → delete all future occurrences
   - Modify single occurrence → create exception
   - View all occurrences of a pattern

### FR-004: Block Time API

**Description:** Allow vendors to block specific time periods.

**Requirements:**
1. **Block Creation**
   - API endpoint: `POST /api/vendor/availability/block`
   - Parameters: start_time, end_time, reason (optional), recurring
   - Store in `blocked_slots` table

2. **Block Types**
   - **One-time:** Single time period
   - **Recurring:** Repeating block (e.g., lunch daily)
   - **Date range:** Block entire date range

3. **Block Enforcement**
   - Exclude blocked slots from availability search
   - Prevent bookings in blocked time
   - Show blocked time in vendor calendar (visual indicator)

4. **Block Management**
   - List all blocks
   - Update block
   - Delete block
   - Unblock time

### FR-005: Conflict Resolution UI

**Description:** User interface for resolving slot conflicts.

**Requirements:**
1. **Conflict Display**
   - Show conflicting slots in calendar view
   - Highlight conflicts visually
   - Show conflict details (time, service, etc.)

2. **Resolution Options**
   - **Keep Existing:** Discard new slot
   - **Replace:** Delete existing, create new
   - **Adjust:** Modify times to remove overlap
   - **Merge:** Combine slots if appropriate

3. **Bulk Resolution**
   - Resolve all conflicts at once
   - Apply resolution to recurring patterns
   - Preview changes before applying

---

## Technical Requirements

### TR-001: Database Schema

**New Tables:**
- `blocked_slots` - Store blocked time periods
- `recurring_slot_patterns` - Store recurring patterns (optional, can use JSONB in availability_slots)

**Schema Changes:**
- Add `recurrence_rule` JSONB column to `availability_slots`
- Add `parent_pattern_id` UUID to `availability_slots` (for linking to patterns)
- Add `version` integer to `availability_slots` (for optimistic locking)
- Add indexes for conflict detection queries

### TR-002: API Endpoints

**New Endpoints:**
- `POST /api/vendor/availability/block` - Block time
- `DELETE /api/vendor/availability/block/:id` - Unblock time
- `GET /api/vendor/availability/conflicts` - Get conflicts
- `POST /api/vendor/availability/resolve-conflict` - Resolve conflict
- `POST /api/vendor/availability/recurring` - Create recurring pattern
- `PUT /api/vendor/availability/recurring/:id` - Update pattern
- `DELETE /api/vendor/availability/recurring/:id` - Delete pattern

**Enhanced Endpoints:**
- `POST /api/vendor/availability` - Add conflict detection
- `PUT /api/vendor/availability/:id` - Add atomic updates
- `DELETE /api/vendor/availability/:id` - Add conflict checking

### TR-003: Performance Requirements

- Conflict detection: < 100ms for 1000 slots
- Atomic updates: < 200ms
- Recurring slot generation: < 500ms for 1 year of slots
- Block time check: < 50ms per availability query

### TR-004: Security Requirements

- Vendors can only manage their own slots
- Blocked slots are vendor-specific
- Conflict resolution requires vendor authentication
- All operations are logged for audit

---

## Non-Functional Requirements

### NFR-001: Reliability
- 99.9% uptime for availability APIs
- Zero data loss on slot operations
- Automatic retry on transient failures

### NFR-002: Scalability
- Support 10,000+ vendors
- Support 100,000+ slots per vendor
- Handle 1000+ concurrent slot operations

### NFR-003: Usability
- Conflict resolution UI must be intuitive
- Error messages must be clear and actionable
- Recurring pattern creation must be simple

### NFR-004: Maintainability
- Code must be well-documented
- Tests must cover all edge cases
- Logging must be comprehensive

---

## Dependencies

### Internal Dependencies
- Existing availability system (`src/lib/core-infrastructure/availabilityEngine.ts`)
- Database schema (`availability_slots` table)
- Vendor authentication system

### External Dependencies
- Supabase database
- No external APIs required

---

## Out of Scope

- Calendar integration (handled in F-002)
- Booking system changes (handled separately)
- Payment system integration
- Notification system (handled separately)

---

## Success Criteria

### Definition of Done
- ✅ All conflict detection requirements implemented
- ✅ All atomic update requirements implemented
- ✅ Recurring slot patterns working
- ✅ Block time API functional
- ✅ Conflict resolution UI complete
- ✅ All tests passing (unit, API, UI)
- ✅ Performance requirements met
- ✅ Documentation complete

### Metrics
- Zero double-bookings in production
- < 100ms conflict detection time
- 100% test coverage for conflict logic
- < 1% conflict resolution errors

---

## Risks & Mitigation

### Risk 1: Performance Degradation
**Risk:** Conflict detection on large slot sets may be slow  
**Mitigation:** Use database indexes, optimize queries, consider caching

### Risk 2: Complex Recurring Patterns
**Risk:** Recurring pattern logic may be complex and error-prone  
**Mitigation:** Use proven libraries (e.g., rrule), extensive testing

### Risk 3: Data Migration
**Risk:** Existing slots may need migration for new schema  
**Mitigation:** Create migration script, test thoroughly, rollback plan

---

## References

- Current availability system: `src/lib/core-infrastructure/availabilityEngine.ts`
- Database schema: `supabase/migrations/`
- Test plan: `tests/plan/vendor-availability-hardening.md`

---

**Last Updated:** 2025-01-16  
**Next Steps:** Design phase (F-004) - Availability conflict resolution design
