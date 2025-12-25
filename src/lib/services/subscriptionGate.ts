import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

/**
 * Check if a vendor has an active subscription
 * @param profileId - The profile ID of the vendor
 * @returns true if subscription is active or trialing, false otherwise
 */
export async function hasActiveSubscription(profileId: string): Promise<boolean> {
  try {
    const { data: subscription, error } = await supabase
      .from('vendor_subscriptions')
      .select('subscription_status')
      .eq('provider_id', profileId)
      .single()

    if (error || !subscription) {
      return false
    }

    return subscription.subscription_status === 'active' || subscription.subscription_status === 'trialing'
  } catch (error) {
    console.error('Error checking subscription status:', error)
    return false
  }
}

/**
 * Get subscription status for a vendor
 * @param profileId - The profile ID of the vendor
 * @returns Subscription status or null if not found
 */
export async function getSubscriptionStatus(profileId: string): Promise<string | null> {
  try {
    const { data: subscription, error } = await supabase
      .from('vendor_subscriptions')
      .select('subscription_status')
      .eq('provider_id', profileId)
      .single()

    if (error || !subscription) {
      return null
    }

    return subscription.subscription_status
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return null
  }
}
