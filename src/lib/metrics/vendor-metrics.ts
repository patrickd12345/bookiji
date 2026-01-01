/**
 * Vendor Metrics - Decision-Informing Metrics Only
 * 
 * Rule: If a metric doesn't inform a decision, delete it.
 * 
 * Tracked metrics:
 * - Activation: signup → first availability
 * - Time to first booking
 * - Reschedule success rate
 * - Cancel/rebook rate
 * - Certification runs per vendor (trust proxy)
 */

import { createClient } from '@supabase/supabase-js'

import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/env/supabaseEnv'

function getSupabaseAdmin() {
  // IMPORTANT: Do not evaluate env vars / create clients at module load.
  // Next.js can import server modules during `next build` ("Collecting page data").
  return createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface VendorMetrics {
  activation_completed: boolean
  time_to_first_availability_hours: number | null
  time_to_first_booking_hours: number | null
  reschedule_success_rate: number // 0-1
  cancel_rebook_rate: number // 0-1
  certification_runs_count: number
  last_certification_date: string | null
}

export async function getVendorMetrics(vendorId: string): Promise<VendorMetrics> {
  const supabase = getSupabaseAdmin()

  // Get vendor profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, role')
    .eq('id', vendorId)
    .eq('role', 'vendor')
    .single()

  if (!profile) {
    throw new Error('Vendor not found')
  }

  const signupDate = new Date(profile.created_at)

  // Check for first availability (slots created)
  const { data: firstSlot } = await supabase
    .from('availability_slots')
    .select('created_at')
    .eq('provider_id', vendorId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const activationCompleted = !!firstSlot
  const timeToFirstAvailability = firstSlot
    ? (new Date(firstSlot.created_at).getTime() - signupDate.getTime()) / (1000 * 60 * 60)
    : null

  // Check for first booking
  const { data: firstBooking } = await supabase
    .from('bookings')
    .select('created_at')
    .eq('provider_id', vendorId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const timeToFirstBooking = firstBooking
    ? (new Date(firstBooking.created_at).getTime() - signupDate.getTime()) / (1000 * 60 * 60)
    : null

  // Reschedule success rate
  const { data: reschedules } = await supabase
    .from('bookings')
    .select('status, previous_booking_id')
    .eq('provider_id', vendorId)
    .not('previous_booking_id', 'is', null)

  const totalReschedules = reschedules?.length || 0
  const successfulReschedules = reschedules?.filter(b => b.status === 'confirmed').length || 0
  const rescheduleSuccessRate = totalReschedules > 0 ? successfulReschedules / totalReschedules : 0

  // Cancel/rebook rate
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('status, previous_booking_id')
    .eq('provider_id', vendorId)

  const cancelledBookings = allBookings?.filter(b => b.status === 'cancelled').length || 0
  const rebookedBookings = allBookings?.filter(b => b.previous_booking_id && b.status === 'confirmed').length || 0
  const cancelRebookRate = cancelledBookings > 0 ? rebookedBookings / cancelledBookings : 0

  // Certification runs (from vendor_certifications table when it exists)
  // For now, return 0 - this will be populated when certification tracking is implemented
  const certificationRunsCount = 0
  const lastCertificationDate = null

  return {
    activation_completed: activationCompleted,
    time_to_first_availability_hours: timeToFirstAvailability,
    time_to_first_booking_hours: timeToFirstBooking,
    reschedule_success_rate: rescheduleSuccessRate,
    cancel_rebook_rate: cancelRebookRate,
    certification_runs_count: certificationRunsCount,
    last_certification_date: lastCertificationDate
  }
}

export async function trackActivation(_vendorId: string) {
  // Track when vendor creates first availability
  // This can be called from the availability creation endpoint
  // For now, it's calculated on-demand in getVendorMetrics
}

export async function trackCertificationRun(_vendorId: string, _result: { status: 'pass' | 'fail', timestamp: string }) {
  // Store certification run in vendor_certifications table
  // TODO: Create table if it doesn't exist
  // await supabase.from('vendor_certifications').insert({
  //   vendor_id: vendorId,
  //   status: result.status,
  //   certified_at: result.timestamp
  // })
}

