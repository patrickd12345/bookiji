import { getServerSupabase } from './supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { addCredits } from './database'

const REFERRAL_REWARD_CUSTOMER_CENTS = 500
const REFERRAL_REWARD_VENDOR_CENTS = 1000

export const referralService = {
  async createReferral(referrerId: string, refereeEmail: string): Promise<void> {
    const { error } = await supabase
      .from('referrals')
      .insert({ referrer_id: referrerId, referee_email: refereeEmail })

    if (error) {
      console.error('Error creating referral:', error)
    }
  },

  async completeReferral(refereeEmail: string, refereeId: string, role: 'customer' | 'vendor'): Promise<void> {
    const { data: referral, error } = await supabase
      .from('referrals')
      .select('id, referrer_id, credited')
      .eq('referee_email', refereeEmail)
      .single()

    if (error || !referral || referral.credited) {
      return
    }

    const reward = role === 'vendor' ? REFERRAL_REWARD_VENDOR_CENTS : REFERRAL_REWARD_CUSTOMER_CENTS
    const result = await addCredits(referral.referrer_id, reward, 'Referral bonus', 'bonus')
    if (result.success) {
      await supabase
        .from('referrals')
        .update({ referee_id: refereeId, role, credited: true, credited_at: new Date().toISOString() })
        .eq('id', referral.id)
    }
  }
}

