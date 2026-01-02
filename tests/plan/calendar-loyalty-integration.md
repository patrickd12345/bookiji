# Test Plan: Calendar Sync + Loyalty Integration

**Task ID:** F-008  
**Status:** In Progress  
**Created:** 2025-01-16  
**Dependencies:** F-002 (Requirements: Calendar sync 2-way), F-003 (Requirements: Loyalty/credits reconciliation)

---

## Overview

This test plan covers comprehensive testing of calendar sync features (2-way sync, ICS import/export, Google Calendar integration) and loyalty/credits system (earn, redeem, tier progression, reconciliation).

---

## Test Strategy

Following the 4-layer testing strategy:

1. **Layer 1: Unit Tests** - Pure business logic without external dependencies
2. **Layer 2: API E2E Tests** - Complete system enforcement
3. **Layer 3: UI E2E Tests** - User-visible behavior validation
4. **Layer 4: UI Crawl** - Surface coverage and regression prevention

---

## Test Scope

### Calendar Sync Features to Test

1. **2-Way Free/Busy Sync (F-015)**
   - Read from Google Calendar
   - Write to Google Calendar
   - Sync status tracking

2. **Write Bookings to Google Calendar (F-016)**
   - Create calendar events for bookings
   - Update events when bookings change
   - Delete events when bookings cancelled

3. **ICS Export/Import (F-017, F-018)**
   - Export vendor schedule as ICS file
   - Import ICS file to create availability
   - Handle invalid ICS files

4. **Invite Generation (F-019)**
   - Generate calendar invites
   - Send invites via email
   - Handle invite acceptance/rejection

5. **Update/Cancel Event Sync (F-020)**
   - Sync booking updates to calendar
   - Sync booking cancellations to calendar
   - Handle calendar sync failures

6. **Sync Status Dashboard (F-021)**
   - Display sync status
   - Show sync errors
   - Allow manual sync trigger

### Loyalty/Credits Features to Test

1. **Earn Credits (F-023)**
   - Earn credits on booking completion
   - Calculate credit amount
   - Handle multiple bookings

2. **Redeem Credits (F-024)**
   - Redeem credits at checkout
   - Apply credit discount
   - Handle insufficient credits

3. **Tier Progression (F-025)**
   - Calculate user tier based on credits
   - Apply tier benefits
   - Handle tier upgrades/downgrades

4. **Credits Reconciliation (F-026)**
   - Reconcile earned vs redeemed credits
   - Detect discrepancies
   - Generate reconciliation reports

5. **Reconciliation Dashboard (F-027)**
   - Display reconciliation status
   - Show discrepancies
   - Allow manual reconciliation

---

## Layer 1: Unit Tests

### Test Files to Create

**`tests/lib/calendarSync/twoWaySync.spec.ts`**
- Test 2-way sync logic
- Test free/busy conversion
- Test conflict resolution

**`tests/lib/calendarSync/writeToCalendar.spec.ts`**
- Test event creation
- Test event updates
- Test event deletion

**`tests/lib/icsGenerator.spec.ts`**
- Test ICS file generation
- Test ICS format compliance
- Test timezone handling

**`tests/lib/icsParser.spec.ts`**
- Test ICS file parsing
- Test invalid file handling
- Test timezone conversion

**`tests/lib/loyalty/earnCredits.spec.ts`**
- Test credit earning logic
- Test credit calculation
- Test edge cases

**`tests/lib/loyalty/redeemCredits.spec.ts`**
- Test credit redemption logic
- Test discount calculation
- Test insufficient credits handling

**`tests/lib/loyalty/tierCalculator.spec.ts`**
- Test tier calculation
- Test tier benefits
- Test tier progression

**`tests/lib/loyalty/reconciliation.spec.ts`**
- Test reconciliation logic
- Test discrepancy detection
- Test reconciliation reporting

### Test Cases

#### Calendar Sync Unit Tests
- ✅ Convert Google Calendar free/busy to availability slots
- ✅ Convert availability slots to Google Calendar events
- ✅ Handle timezone conversions
- ✅ Handle recurring events
- ✅ Handle event updates
- ✅ Handle event cancellations
- ✅ Generate valid ICS files
- ✅ Parse valid ICS files
- ✅ Reject invalid ICS files
- ✅ Handle missing calendar permissions

#### Loyalty Unit Tests
- ✅ Calculate credits earned from booking
- ✅ Apply tier multipliers
- ✅ Calculate credit redemption discount
- ✅ Handle partial credit redemption
- ✅ Calculate user tier from total credits
- ✅ Apply tier benefits
- ✅ Detect reconciliation discrepancies
- ✅ Generate reconciliation reports

---

## Layer 2: API E2E Tests

### Test Files to Create

**`tests/integration/calendar-sync.spec.ts`**
- Test calendar sync API endpoints
- Test Google Calendar integration
- Test ICS import/export APIs

**`tests/integration/loyalty-reconciliation.spec.ts`**
- Test loyalty API endpoints
- Test credits earn/redeem APIs
- Test reconciliation job

### Test Cases

#### Calendar Sync API Tests
- ✅ Connect Google Calendar (OAuth flow)
- ✅ Sync free/busy from Google Calendar
- ✅ Create booking → creates calendar event
- ✅ Update booking → updates calendar event
- ✅ Cancel booking → deletes calendar event
- ✅ Export schedule as ICS file
- ✅ Import ICS file → creates availability slots
- ✅ Get sync status
- ✅ Trigger manual sync
- ✅ Handle sync errors gracefully

#### Loyalty API Tests
- ✅ Complete booking → earns credits
- ✅ Redeem credits at checkout
- ✅ Get credit balance
- ✅ Get user tier
- ✅ Run reconciliation job
- ✅ Get reconciliation report
- ✅ Handle insufficient credits error

---

## Layer 3: UI E2E Tests

### Test Files to Create

**`tests/e2e/vendor/calendar-sync.spec.ts`**
- Test calendar sync UI
- Test sync status dashboard
- Test ICS import/export UI

**`tests/e2e/customer/loyalty.spec.ts`**
- Test credit redemption UI
- Test tier display
- Test credit balance display

### Test Cases

#### Calendar Sync UI Tests
- ✅ Vendor can connect Google Calendar
- ✅ Sync status displays correctly
- ✅ Sync errors displayed to user
- ✅ Vendor can trigger manual sync
- ✅ Vendor can export schedule as ICS
- ✅ Vendor can import ICS file
- ✅ Import errors displayed clearly

#### Loyalty UI Tests
- ✅ Customer sees credit balance
- ✅ Customer sees current tier
- ✅ Customer can redeem credits at checkout
- ✅ Credit discount applied correctly
- ✅ Insufficient credits error displayed
- ✅ Tier benefits displayed

---

## Layer 4: UI Crawl

### Test Files to Create

**`tests/e2e/crawl/calendar-loyalty.spec.ts`**
- Ensure all calendar/loyalty pages render
- Ensure no crashes
- Ensure error states handled

### Test Cases
- ✅ `/vendor/calendar/sync-status` page renders
- ✅ `/vendor/calendar/export` page renders
- ✅ `/customer/credits` page renders
- ✅ `/customer/tier` page renders
- ✅ Error pages render correctly

---

## Integration Tests

### Test Files to Create

**`tests/e2e/integration/booking-flow-complete.spec.ts`**
- Test complete booking flow with calendar sync and loyalty
- Test end-to-end scenarios

### Test Cases
- ✅ Customer books → vendor calendar updated → customer earns credits
- ✅ Customer redeems credits → booking created → calendar event created
- ✅ Booking cancelled → calendar event deleted → credits refunded (if applicable)
- ✅ Calendar sync fails → booking still succeeds → error logged
- ✅ Credits reconciliation runs → discrepancies detected → report generated

---

## Performance Tests

### Load Testing
- ✅ Sync 1000+ calendar events
- ✅ Generate ICS file for 1 year of slots (< 2s)
- ✅ Parse large ICS file (< 5s)
- ✅ Calculate credits for 1000+ bookings (< 1s)
- ✅ Run reconciliation for 10,000+ transactions (< 30s)

---

## Security Tests

### Authorization
- ✅ Vendor can only sync own calendar
- ✅ Customer can only view own credits
- ✅ Admin can view all reconciliation data
- ✅ OAuth tokens stored securely

### Input Validation
- ✅ Invalid ICS files rejected
- ✅ Malicious calendar data sanitized
- ✅ Credit amounts validated
- ✅ Tier calculations verified

---

## Test Data Requirements

### Test Users
- Vendor with Google Calendar connected
- Vendor without calendar connection
- Customer with credits
- Customer at different tiers
- Admin user

### Test Scenarios
- Fresh calendar sync
- Existing calendar with conflicts
- Large calendar (1000+ events)
- Credits reconciliation with discrepancies
- Tier progression scenarios

---

## Success Criteria

### Unit Tests
- ✅ 100% code coverage for calendar sync logic
- ✅ 100% code coverage for loyalty logic
- ✅ All edge cases covered

### API Tests
- ✅ All calendar sync endpoints tested
- ✅ All loyalty endpoints tested
- ✅ All error cases tested
- ✅ Performance requirements met

### UI Tests
- ✅ All user flows tested
- ✅ All UI components tested
- ✅ Accessibility requirements met

### Integration Tests
- ✅ End-to-end flows work correctly
- ✅ Calendar sync and loyalty work together
- ✅ No regressions

---

## Test Execution Plan

1. **Week 1:** Write calendar sync unit tests (Layer 1)
2. **Week 2:** Write loyalty unit tests (Layer 1)
3. **Week 3:** Write API integration tests (Layer 2)
4. **Week 4:** Write UI tests (Layer 3) + Integration tests
5. **Week 5:** Write crawl tests (Layer 4) + Performance tests

---

## Dependencies

- F-002: Calendar sync requirements must be complete
- F-003: Loyalty reconciliation requirements must be complete
- F-005: Calendar sync architecture design must be complete
- F-006: Credits reconciliation design must be complete
- F-015 through F-027: All build tasks must be implemented

---

## Notes

- Mock Google Calendar API for unit tests
- Use test Google Calendar account for integration tests
- Use test Stripe account for payment tests
- Follow existing test patterns from `tests/integration/`
- Use Vitest for unit tests, Playwright for E2E tests

---

## Calendar Sync Specific Considerations

- Test OAuth flow (may require manual steps)
- Test rate limiting on Google Calendar API
- Test handling of calendar permission revocations
- Test handling of calendar not found errors
- Test handling of network timeouts

## Loyalty Specific Considerations

- Test credit calculation accuracy
- Test tier calculation accuracy
- Test reconciliation accuracy
- Test handling of negative credits (if allowed)
- Test handling of expired credits (if applicable)

---

**Last Updated:** 2025-01-16  
**Next Steps:** Review requirements (F-002, F-003) and design (F-005, F-006) documents before implementing tests
