# Design: Credits Reconciliation System

**Task ID:** F-006  
**Status:** ✅ Complete  
**Created:** 2025-01-16  
**Duration:** 3 days  
**Target Date:** 2026-01-12  
**Dependencies:** F-003 (Requirements: Loyalty/credits reconciliation)

---

## Overview

This document provides the technical design for implementing a credits reconciliation system that ensures accuracy of credit balances, detects discrepancies, and provides tools for resolution.

---

## Design Principles

1. **Accuracy First:** Credits must be 100% accurate
2. **Automated Detection:** Discrepancies detected automatically
3. **Audit Trail:** All credit operations fully auditable
4. **Idempotency:** Reconciliation can run multiple times safely
5. **Performance:** Reconciliation must complete quickly

---

## Architecture

### Reconciliation System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Reconciliation Engine                   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Credit Transaction Aggregator           │   │
│  │  - Sum earned transactions                       │   │
│  │  - Sum redeemed transactions                     │   │
│  │  - Calculate expected balance                    │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌───────────────────────┼───────────────────────────┐   │
│  │  Discrepancy Detector  │  Tier Calculator         │   │
│  │  - Compare balances    │  - Calculate tier        │   │
│  │  - Find mismatches     │  - Update tier           │   │
│  │  - Classify issues     │  - Track progression     │   │
│  └───────────────────────┼───────────────────────────┘   │
│                          │                               │
│  ┌───────────────────────┴───────────────────────────┐   │
│  │         Reconciliation Reporter                   │   │
│  │  - Generate reports                                │   │
│  │  - Store discrepancies                            │   │
│  │  - Track resolutions                              │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Database Design

### Schema Changes

#### 1. Enhance user_credits Table

```sql
ALTER TABLE user_credits
ADD COLUMN IF NOT EXISTS lifetime_earned_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS last_reconciliation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT CHECK (reconciliation_status IN ('pending', 'verified', 'discrepancy')) DEFAULT 'pending';

CREATE INDEX idx_user_credits_tier ON user_credits(tier);
CREATE INDEX idx_user_credits_reconciliation 
ON user_credits(reconciliation_status, last_reconciliation_at);
```

#### 2. Reconciliation Runs Table

```sql
CREATE TABLE reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL CHECK (run_type IN ('full', 'incremental', 'user_specific')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')) DEFAULT 'running',
  users_processed INTEGER DEFAULT 0,
  users_with_discrepancies INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  error_details JSONB,
  created_by TEXT, -- System or admin user
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_runs_status 
ON reconciliation_runs(status, started_at DESC);
```

#### 3. Reconciliation Discrepancies Table

```sql
CREATE TABLE reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id UUID NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN (
    'balance_mismatch',
    'lifetime_mismatch',
    'missing_transaction',
    'duplicate_transaction',
    'tier_mismatch'
  )),
  expected_value NUMERIC,
  actual_value NUMERIC,
  difference NUMERIC,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('detected', 'investigating', 'resolved', 'ignored')) DEFAULT 'detected',
  resolution_action TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_discrepancies_user 
ON reconciliation_discrepancies(user_id, status);
CREATE INDEX idx_reconciliation_discrepancies_run 
ON reconciliation_discrepancies(reconciliation_run_id);
CREATE INDEX idx_reconciliation_discrepancies_severity 
ON reconciliation_discrepancies(severity, status);
```

#### 4. Credit Adjustments Table

```sql
CREATE TABLE credit_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  discrepancy_id UUID REFERENCES reconciliation_discrepancies(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('correction', 'manual', 'reconciliation')),
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by TEXT NOT NULL, -- Admin user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_adjustments_user 
ON credit_adjustments(user_id, created_at DESC);
```

---

## Reconciliation Algorithm

### Full Reconciliation Process

```typescript
// src/lib/loyalty/reconciliation.ts

export class CreditsReconciliationEngine {
  async reconcileUser(userId: string): Promise<ReconciliationResult> {
    // 1. Get current credit balance
    const currentBalance = await this.getUserBalance(userId);
    
    // 2. Sum all earned transactions
    const earnedTotal = await this.sumTransactions(userId, 'earn');
    
    // 3. Sum all redeemed transactions
    const redeemedTotal = await this.sumTransactions(userId, 'redeem');
    
    // 4. Calculate expected balance
    const expectedBalance = earnedTotal - redeemedTotal;
    
    // 5. Compare with actual balance
    const balanceDiscrepancy = currentBalance - expectedBalance;
    
    // 6. Check lifetime earned
    const lifetimeEarned = await this.getLifetimeEarned(userId);
    const lifetimeDiscrepancy = lifetimeEarned - earnedTotal;
    
    // 7. Check tier
    const expectedTier = this.calculateTier(lifetimeEarned);
    const actualTier = await this.getUserTier(userId);
    const tierMismatch = expectedTier !== actualTier;
    
    // 8. Detect discrepancies
    const discrepancies = this.detectDiscrepancies({
      balanceDiscrepancy,
      lifetimeDiscrepancy,
      tierMismatch
    });
    
    // 9. Store discrepancies
    if (discrepancies.length > 0) {
      await this.storeDiscrepancies(userId, discrepancies);
    }
    
    // 10. Update reconciliation status
    await this.updateReconciliationStatus(userId, discrepancies);
    
    return {
      userId,
      discrepancies,
      balanceDiscrepancy,
      lifetimeDiscrepancy,
      tierMismatch
    };
  }
  
  async reconcileAllUsers(): Promise<ReconciliationRunResult> {
    // 1. Create reconciliation run record
    const runId = await this.createReconciliationRun();
    
    // 2. Get all users with credits
    const users = await this.getUsersWithCredits();
    
    // 3. Process users in batches
    const results = await this.processBatch(users, async (userId) => {
      return await this.reconcileUser(userId);
    });
    
    // 4. Aggregate results
    const summary = this.aggregateResults(results);
    
    // 5. Update reconciliation run
    await this.updateReconciliationRun(runId, summary);
    
    return summary;
  }
}
```

### Discrepancy Detection

```typescript
function detectDiscrepancies(data: {
  balanceDiscrepancy: number;
  lifetimeDiscrepancy: number;
  tierMismatch: boolean;
}): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  
  // Balance mismatch
  if (Math.abs(data.balanceDiscrepancy) > 0.01) {
    discrepancies.push({
      type: 'balance_mismatch',
      severity: Math.abs(data.balanceDiscrepancy) > 1000 ? 'high' : 'medium',
      expected: data.expectedBalance,
      actual: data.currentBalance,
      difference: data.balanceDiscrepancy
    });
  }
  
  // Lifetime mismatch
  if (Math.abs(data.lifetimeDiscrepancy) > 0.01) {
    discrepancies.push({
      type: 'lifetime_mismatch',
      severity: 'high',
      expected: data.expectedLifetime,
      actual: data.actualLifetime,
      difference: data.lifetimeDiscrepancy
    });
  }
  
  // Tier mismatch
  if (data.tierMismatch) {
    discrepancies.push({
      type: 'tier_mismatch',
      severity: 'medium',
      expected: data.expectedTier,
      actual: data.actualTier
    });
  }
  
  return discrepancies;
}
```

---

## Tier Calculation

### Tier Calculation Logic

```typescript
// src/lib/loyalty/tierCalculator.ts

export class TierCalculator {
  private static TIER_THRESHOLDS = {
    bronze: 0,
    silver: 100000,      // $1,000
    gold: 500000,        // $5,000
    platinum: 1000000    // $10,000
  };
  
  calculateTier(lifetimeEarnedCents: number): Tier {
    if (lifetimeEarnedCents >= TierCalculator.TIER_THRESHOLDS.platinum) {
      return 'platinum';
    }
    if (lifetimeEarnedCents >= TierCalculator.TIER_THRESHOLDS.gold) {
      return 'gold';
    }
    if (lifetimeEarnedCents >= TierCalculator.TIER_THRESHOLDS.silver) {
      return 'silver';
    }
    return 'bronze';
  }
  
  calculateProgressToNextTier(
    currentTier: Tier,
    lifetimeEarnedCents: number
  ): TierProgress {
    const currentThreshold = TierCalculator.TIER_THRESHOLDS[currentTier];
    const nextTier = this.getNextTier(currentTier);
    const nextThreshold = TierCalculator.TIER_THRESHOLDS[nextTier];
    
    const progress = (lifetimeEarnedCents - currentThreshold) / 
                     (nextThreshold - currentThreshold);
    
    return {
      currentTier,
      nextTier,
      progress: Math.min(progress, 1),
      creditsToNextTier: Math.max(0, nextThreshold - lifetimeEarnedCents)
    };
  }
  
  getTierBenefits(tier: Tier): TierBenefits {
    return {
      bronze: { multiplier: 1.0, discount: 0 },
      silver: { multiplier: 1.2, discount: 0 },
      gold: { multiplier: 1.5, discount: 5 },
      platinum: { multiplier: 2.0, discount: 10 }
    }[tier];
  }
}
```

---

## Credit Earning System

### Earning on Booking Completion

```typescript
// src/lib/loyalty/earnCredits.ts

export class CreditEarningService {
  async earnCreditsOnBookingCompletion(
    userId: string,
    bookingId: string,
    bookingAmountCents: number
  ): Promise<EarnCreditsResult> {
    // 1. Get user tier
    const userTier = await this.getUserTier(userId);
    
    // 2. Calculate earning amount
    const baseEarning = bookingAmountCents * 0.05; // 5% base
    const tierMultiplier = this.getTierMultiplier(userTier);
    const earningAmount = Math.floor(baseEarning * tierMultiplier);
    
    // 3. Add credits atomically
    const result = await this.addCreditsAtomically({
      userId,
      amountCents: earningAmount,
      transactionType: 'earn',
      description: `Earned from booking ${bookingId}`,
      referenceType: 'booking',
      referenceId: bookingId
    });
    
    // 4. Update lifetime earned
    await this.updateLifetimeEarned(userId, earningAmount);
    
    // 5. Recalculate tier
    await this.recalculateTier(userId);
    
    // 6. Notify user
    await this.notifyUser(userId, {
      creditsEarned: earningAmount,
      newTier: await this.getUserTier(userId)
    });
    
    return result;
  }
  
  private async addCreditsAtomically(params: {
    userId: string;
    amountCents: number;
    transactionType: 'earn' | 'redeem' | 'refund';
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<EarnCreditsResult> {
    // Use database transaction
    // Update user_credits.balance_cents
    // Insert credit_transactions record
    // Return result
  }
}
```

---

## Credit Redemption System

### Redemption at Checkout

```typescript
// src/lib/loyalty/redeemCredits.ts

export class CreditRedemptionService {
  async redeemCreditsAtCheckout(
    userId: string,
    bookingId: string,
    redemptionAmountCents: number
  ): Promise<RedeemCreditsResult> {
    // 1. Validate sufficient credits
    const balance = await this.getUserBalance(userId);
    if (balance < redemptionAmountCents) {
      throw new InsufficientCreditsError();
    }
    
    // 2. Deduct credits atomically
    const result = await this.deductCreditsAtomically({
      userId,
      amountCents: redemptionAmountCents,
      transactionType: 'redeem',
      description: `Redeemed for booking ${bookingId}`,
      referenceType: 'booking',
      referenceId: bookingId
    });
    
    // 3. Calculate discount
    const discountAmount = redemptionAmountCents;
    
    // 4. Return redemption result
    return {
      success: true,
      creditsRedeemed: redemptionAmountCents,
      discountAmount,
      remainingBalance: balance - redemptionAmountCents
    };
  }
}
```

---

## Reconciliation Job

### Cron Job Implementation

```typescript
// scripts/cron/credits-reconciliation.ts

export async function runCreditsReconciliation() {
  const runId = await createReconciliationRun();
  
  try {
    const engine = new CreditsReconciliationEngine();
    const result = await engine.reconcileAllUsers();
    
    await updateReconciliationRun(runId, {
      status: 'completed',
      users_processed: result.usersProcessed,
      users_with_discrepancies: result.usersWithDiscrepancies,
      discrepancies_found: result.discrepanciesFound
    });
    
    // Alert if significant discrepancies found
    if (result.discrepanciesFound > 10) {
      await sendAlert({
        severity: 'high',
        message: `Reconciliation found ${result.discrepanciesFound} discrepancies`
      });
    }
  } catch (error) {
    await updateReconciliationRun(runId, {
      status: 'failed',
      error_details: { error: error.message }
    });
    throw error;
  }
}
```

### Cron Configuration

```sql
-- Daily reconciliation at 2 AM UTC
SELECT cron.schedule(
  'credits-reconciliation-daily',
  '0 2 * * *',
  $$
  SELECT run_credits_reconciliation();
  $$
);
```

---

## Reconciliation Dashboard

### Admin Dashboard Design

```typescript
// src/app/admin/loyalty/reconciliation/page.tsx

export default function ReconciliationDashboard() {
  // Display:
  // - Last reconciliation run status
  // - Discrepancy count by severity
  // - Affected users
  // - Resolution actions
  // - Reconciliation history
}
```

### Dashboard Features

1. **Status Overview**
   - Last run time
   - Run status
   - Discrepancy summary
   - Affected user count

2. **Discrepancy List**
   - Filter by severity
   - Filter by status
   - Sort by difference amount
   - View details

3. **Resolution Actions**
   - Auto-resolve simple discrepancies
   - Manual adjustment form
   - Bulk resolution
   - Resolution history

4. **Reports**
   - Export reconciliation report
   - View reconciliation history
   - Trend analysis

---

## API Design

### Reconciliation Endpoints

```typescript
// Trigger reconciliation (admin only)
POST /api/admin/loyalty/reconcile
{
  "scope": "all" | "user_specific",
  "user_id": "uuid" // if user_specific
}

// Get reconciliation status
GET /api/admin/loyalty/reconciliation
?run_id=uuid // optional

// Get discrepancies
GET /api/admin/loyalty/reconciliation/discrepancies
?severity=high
&status=detected
&limit=100

// Resolve discrepancy
POST /api/admin/loyalty/reconciliation/resolve
{
  "discrepancy_id": "uuid",
  "resolution_action": "adjust" | "ignore",
  "adjustment_amount": 0, // if adjust
  "notes": "string"
}
```

---

## Performance Considerations

### Query Optimization

```sql
-- Efficient transaction aggregation
CREATE INDEX idx_credit_transactions_user_type 
ON credit_transactions(user_id, transaction_type, created_at);

-- Efficient reconciliation queries
CREATE INDEX idx_credit_transactions_reconciliation 
ON credit_transactions(user_id, transaction_type) 
INCLUDE (amount_cents);
```

### Batch Processing

- Process users in batches of 100
- Use database aggregation functions
- Parallel processing where possible
- Progress tracking

---

## Error Handling

### Reconciliation Errors

```typescript
enum ReconciliationError {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TRANSACTION_SUM_ERROR = 'TRANSACTION_SUM_ERROR',
  BALANCE_CALCULATION_ERROR = 'BALANCE_CALCULATION_ERROR',
  TIER_CALCULATION_ERROR = 'TIER_CALCULATION_ERROR'
}
```

### Error Recovery

- Log all errors
- Continue processing other users
- Retry failed users
- Generate error report

---

## Testing Strategy

### Unit Tests
- Reconciliation algorithm
- Discrepancy detection
- Tier calculation
- Credit earning/redeeming

### Integration Tests
- Full reconciliation job
- Database transaction integrity
- Discrepancy storage
- Resolution actions

### E2E Tests
- Admin triggers reconciliation
- Discrepancies appear in dashboard
- Admin resolves discrepancy
- Credits adjusted correctly

---

## Migration Plan

### Phase 1: Database Schema
1. Add columns to user_credits
2. Create reconciliation_runs table
3. Create reconciliation_discrepancies table
4. Create credit_adjustments table
5. Create indexes

### Phase 2: Reconciliation Engine
1. Implement reconciliation algorithm
2. Implement discrepancy detection
3. Create reconciliation job
4. Test with sample data

### Phase 3: Dashboard
1. Build admin dashboard
2. Implement resolution actions
3. Add reporting
4. Test end-to-end

---

## Rollback Plan

If issues arise:
1. Disable reconciliation job
2. Revert database changes if needed
3. Manual reconciliation if required
4. Fix data issues manually

---

## Success Criteria

- ✅ 100% reconciliation accuracy
- ✅ Zero balance discrepancies
- ✅ < 5 minutes reconciliation time for 10,000 users
- ✅ All discrepancies detected and resolved
- ✅ Tier calculations accurate

---

## References

- Requirements: `docs/requirements/loyalty-reconciliation.md`
- Existing credits system: `src/lib/credits.ts`
- Credits database: `src/lib/database.ts`
- Test plan: `tests/plan/calendar-loyalty-integration.md`

---

**Last Updated:** 2025-01-16  
**Next Steps:** Build phase (F-023) - Implement earn credits on booking completion
