/**
 * Subscription Guard - Invariant III-1 Enforcement
 * 
 * Server-side enforcement that vendors must have active subscription
 * to perform scheduling mutations.
 * 
 * This is the canonical, single source of truth for subscription gating.
 * All scheduling mutations MUST use this guard.
 * 
 * @see docs/development/SCHEDULING_INVARIANTS.md (III-1)
 */

import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export class SubscriptionRequiredError extends Error {
  constructor(vendorId: string) {
    super(`Vendor ${vendorId} does not have an active subscription. Scheduling mutations are blocked.`)
    this.name = 'SubscriptionRequiredError'
  }
}

/**
 * Assert that a vendor has an active subscription.
 * 
 * Throws SubscriptionRequiredError if subscription is not active.
 * 
 * Active subscription states: 'active', 'trialing'
 * Inactive states: 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
 * 
 * @param vendorId - The vendor's profile ID (profiles.id, not auth.users.id)
 * @throws SubscriptionRequiredError if subscription is not active
 */
export async function assertVendorHasActiveSubscription(vendorId: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  // Query vendor_subscriptions table (webhook-synced state is source of truth)
  const { data: subscription, error } = await supabase
    .from('vendor_subscriptions')
    .select('subscription_status')
    .eq('provider_id', vendorId)
    .single()

  // If no subscription record exists, vendor is not subscribed
  if (error || !subscription) {
    throw new SubscriptionRequiredError(vendorId)
  }

  // Only 'active' and 'trialing' are considered active
  const activeStates = ['active', 'trialing']
  if (!activeStates.includes(subscription.subscription_status)) {
    throw new SubscriptionRequiredError(vendorId)
  }
}

/**
 * Check if vendor has active subscription (non-throwing version).
 * 
 * @param vendorId - The vendor's profile ID
 * @returns true if subscription is active, false otherwise
 */
export async function hasActiveSubscription(vendorId: string): Promise<boolean> {
  try {
    await assertVendorHasActiveSubscription(vendorId)
    return true
  } catch {
    return false
  }
}

