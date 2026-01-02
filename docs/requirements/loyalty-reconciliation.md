# Requirements: Loyalty/Credits Reconciliation

**Task ID:** F-003  
**Status:** ✅ Complete  
**Created:** 2025-01-16  
**Duration:** 2 days  
**Target Date:** 2026-01-06

---

## Overview

This document defines requirements for implementing a comprehensive loyalty and credits system with reconciliation capabilities, ensuring accurate tracking of credits earned, redeemed, and tier progression.

---

## Business Requirements

### BR-001: Earn Credits on Booking Completion
**Priority:** 🔴 CRITICAL

Customers must earn loyalty credits when they complete a booking, incentivizing repeat usage.

**Acceptance Criteria:**
- Credits earned automatically when booking status changes to "completed"
- Credit amount calculated based on booking value
- Credits added to customer's balance
- Transaction recorded in credit_transactions table
- Customer notified of credits earned

### BR-002: Redeem Credits at Checkout
**Priority:** 🔴 CRITICAL

Customers must be able to redeem credits to reduce booking cost at checkout.

**Acceptance Criteria:**
- Customer can apply credits during checkout
- Credit discount applied to total amount
- Remaining balance charged to payment method
- Credits deducted from customer balance
- Transaction recorded
- Customer sees credit balance and redemption options

### BR-003: Tier Progression
**Priority:** 🟡 HIGH

Customers must progress through loyalty tiers (Bronze, Silver, Gold, Platinum) based on lifetime credits earned.

**Acceptance Criteria:**
- Tier calculated from lifetime_earned_cents
- Tier benefits applied automatically
- Tier displayed in customer dashboard
- Progress to next tier shown
- Tier upgrades trigger notifications

### BR-004: Credits Reconciliation
**Priority:** 🟡 HIGH

System must reconcile credits to ensure accuracy and detect discrepancies.

**Acceptance Criteria:**
- Automated reconciliation job runs daily
- Compares earned vs redeemed credits
- Detects discrepancies
- Generates reconciliation reports
- Alerts on significant discrepancies

### BR-005: Reconciliation Dashboard
**Priority:** 🟢 MEDIUM

Admins must be able to view reconciliation status and resolve discrepancies.

**Acceptance Criteria:**
- Dashboard shows reconciliation status
- Displays discrepancies with details
- Allows manual reconciliation
- Shows reconciliation history
- Export reconciliation reports

---

## Functional Requirements

### FR-001: Credit Earning System

**Description:** System for earning credits on booking completion.

**Requirements:**
1. **Earning Rules**
   - Base earning: X% of booking value (e.g., 5%)
   - Tier multipliers: Higher tiers earn more (e.g., Gold = 1.5x)
   - Minimum earning: Always earn at least 1 credit
   - Maximum earning: Cap per booking (if applicable)

2. **Earning Calculation**
   - Calculate from booking total_amount_cents
   - Apply tier multiplier
   - Round to nearest cent
   - Store in lifetime_earned_cents

3. **Earning Trigger**
   - Trigger on booking status = "completed"
   - Idempotent (don't earn twice for same booking)
   - Handle booking updates (recalculate if needed)
   - Log all earning transactions

4. **Earning Notification**
   - Notify customer of credits earned
   - Show credit amount in notification
   - Include tier progression info if applicable

### FR-002: Credit Redemption System

**Description:** System for redeeming credits at checkout.

**Requirements:**
1. **Redemption Rules**
   - Customer can redeem up to 100% of booking cost
   - Minimum redemption: 1 credit
   - Maximum redemption: Available balance or booking cost (whichever is less)
   - Partial redemption allowed

2. **Redemption Calculation**
   - Calculate discount from credits redeemed
   - Apply discount to booking total
   - Charge remaining amount to payment method
   - Deduct credits from balance

3. **Redemption UI**
   - Show available credit balance
   - Show redemption options (slider or input)
   - Show discount amount preview
   - Show final amount after discount

4. **Redemption Processing**
   - Validate sufficient credits
   - Process redemption atomically
   - Record transaction
   - Update booking with credit discount

### FR-003: Tier Progression System

**Description:** System for calculating and applying loyalty tiers.

**Requirements:**
1. **Tier Thresholds**
   - **Bronze:** 0 - 99,999 cents ($0 - $999.99)
   - **Silver:** 100,000 - 499,999 cents ($1,000 - $4,999.99)
   - **Gold:** 500,000 - 999,999 cents ($5,000 - $9,999.99)
   - **Platinum:** 1,000,000+ cents ($10,000+)

2. **Tier Calculation**
   - Calculate from lifetime_earned_cents
   - Update tier on credit earning
   - Store tier in user_credits table
   - Recalculate if needed (data fixes)

3. **Tier Benefits**
   - **Bronze:** Base earning rate (1x)
   - **Silver:** 1.2x earning multiplier
   - **Gold:** 1.5x earning multiplier
   - **Platinum:** 2x earning multiplier + special perks

4. **Tier Display**
   - Show current tier in dashboard
   - Show progress to next tier
   - Show tier benefits
   - Celebrate tier upgrades

### FR-004: Credits Reconciliation Job

**Description:** Automated job to reconcile credits and detect discrepancies.

**Requirements:**
1. **Reconciliation Logic**
   - Sum all credit_transactions (earn type)
   - Sum all credit_transactions (redeem type)
   - Compare with user_credits.balance_cents
   - Compare with user_credits.lifetime_earned_cents
   - Detect discrepancies

2. **Discrepancy Detection**
   - Balance mismatch: balance != (earned - redeemed)
   - Lifetime mismatch: lifetime_earned != sum(earn transactions)
   - Missing transactions
   - Duplicate transactions

3. **Reconciliation Execution**
   - Run daily via cron job
   - Process all users
   - Generate reconciliation report
   - Store results in reconciliation_runs table
   - Alert on significant discrepancies

4. **Reconciliation Reporting**
   - Report discrepancies found
   - Report users affected
   - Report discrepancy amounts
   - Report resolution status

### FR-005: Reconciliation Dashboard

**Description:** Admin dashboard for viewing and resolving reconciliation issues.

**Requirements:**
1. **Dashboard Display**
   - Show last reconciliation run
   - Show reconciliation status (success, warnings, errors)
   - Show discrepancy count
   - Show affected user count

2. **Discrepancy Details**
   - List all discrepancies
   - Show user, amount, type
   - Show suggested resolution
   - Allow filtering and sorting

3. **Resolution Actions**
   - Auto-resolve simple discrepancies
   - Manual resolution for complex cases
   - Adjust credit balances
   - Create adjustment transactions
   - Log all resolution actions

4. **History & Reports**
   - View reconciliation history
   - Export reconciliation reports
   - View resolution audit trail

---

## Technical Requirements

### TR-001: Database Schema

**Existing Tables (Enhance):**
- `user_credits` - Add `lifetime_earned_cents`, `tier`, `last_reconciliation`
- `credit_transactions` - Ensure proper transaction types

**New Tables:**
- `reconciliation_runs` - Track reconciliation job executions
- `reconciliation_discrepancies` - Store detected discrepancies
- `credit_adjustments` - Track manual adjustments

**Schema Changes:**
- Add `tier` enum to `user_credits`
- Add `lifetime_earned_cents` to `user_credits`
- Add `reconciliation_status` to `user_credits`
- Add indexes for reconciliation queries

### TR-002: API Endpoints

**New Endpoints:**
- `POST /api/loyalty/earn` - Earn credits (internal, triggered by booking completion)
- `POST /api/loyalty/redeem` - Redeem credits at checkout
- `GET /api/loyalty/tier` - Get user tier and progress
- `POST /api/admin/loyalty/reconcile` - Trigger reconciliation job
- `GET /api/admin/loyalty/reconciliation` - Get reconciliation status
- `POST /api/admin/loyalty/resolve-discrepancy` - Resolve discrepancy

**Enhanced Endpoints:**
- `POST /api/bookings/confirm` - Trigger credit earning
- `GET /api/credits/balance` - Include tier information
- `POST /api/credits/use` - Enhance for redemption

### TR-003: Cron Jobs

**New Cron Job:**
- Daily reconciliation job
- Runs at 2 AM UTC
- Processes all users
- Generates reports
- Sends alerts if needed

### TR-004: Performance Requirements

- Credit earning: < 100ms per booking
- Credit redemption: < 200ms
- Tier calculation: < 50ms
- Reconciliation job: < 5 minutes for 10,000 users
- Reconciliation dashboard: < 2 seconds load time

### TR-005: Security Requirements

- Credits can only be earned through booking completion
- Credits can only be redeemed by credit owner
- Reconciliation requires admin access
- All credit operations logged
- Prevent credit manipulation

---

## Non-Functional Requirements

### NFR-001: Accuracy
- 100% accuracy in credit calculations
- Zero credit balance discrepancies
- Accurate tier calculations
- Reliable reconciliation

### NFR-002: Reliability
- Credit earning never fails silently
- Redemption always processes correctly
- Reconciliation job always completes
- Graceful error handling

### NFR-003: Usability
- Clear credit balance display
- Easy credit redemption
- Transparent tier progression
- Helpful reconciliation dashboard

### NFR-004: Auditability
- All credit transactions logged
- Reconciliation runs logged
- Discrepancy resolutions logged
- Full audit trail available

---

## Dependencies

### Internal Dependencies
- Existing credits system (`src/lib/credits.ts`)
- Booking system (`src/lib/bookingEngine.ts`)
- Payment system (for redemption)
- Notification system (for earning notifications)

### External Dependencies
- None (all internal)

---

## Out of Scope

- Credit purchase system (already exists)
- Referral credits (handled separately)
- Promotional credits (handled separately)
- Credit expiration (future feature)
- Credit transfers between users (not planned)

---

## Success Criteria

### Definition of Done
- ✅ Credit earning on booking completion working
- ✅ Credit redemption at checkout working
- ✅ Tier progression system functional
- ✅ Reconciliation job running daily
- ✅ Reconciliation dashboard complete
- ✅ All tests passing
- ✅ Performance requirements met
- ✅ Documentation complete

### Metrics
- 100% credit calculation accuracy
- Zero balance discrepancies
- < 100ms credit operations
- 100% reconciliation success rate

---

## Risks & Mitigation

### Risk 1: Credit Calculation Errors
**Risk:** Incorrect credit calculations may cause customer dissatisfaction  
**Mitigation:** Extensive testing, reconciliation job, manual review process

### Risk 2: Reconciliation Performance
**Risk:** Reconciliation job may be slow with many users  
**Mitigation:** Optimize queries, batch processing, run during off-peak hours

### Risk 3: Data Inconsistencies
**Risk:** Existing data may have inconsistencies  
**Mitigation:** Data migration script, reconciliation fixes, audit process

### Risk 4: Tier Calculation Complexity
**Risk:** Tier calculation may be complex with edge cases  
**Mitigation:** Clear tier rules, comprehensive testing, simple calculation logic

---

## References

- Current credits system: `src/lib/credits.ts`
- Credits database: `src/lib/database.ts` (addCredits, useCredits)
- Credits types: `src/types/credits.ts`
- Test plan: `tests/plan/calendar-loyalty-integration.md`

---

**Last Updated:** 2025-01-16  
**Next Steps:** Design phase (F-006) - Credits reconciliation system design
