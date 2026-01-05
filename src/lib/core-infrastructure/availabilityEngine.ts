/**
 * Availability Engine
 * 
 * Computes availability for vendors based on calendar data and business rules.
 * 
 * Properties:
 * - Deterministic (same inputs → same outputs)
 * - Recomputable (can regenerate from source data)
 * - Explainable (can show why a slot is/isn't available)
 * - Versioned (hash or revision ID for cache invalidation)
 */

import type {
  VendorAvailability,
  AvailabilitySlot,
  AvailabilityComputationFactors,
} from '@/types/core-infrastructure'
import { AvailabilityConfidence } from '@/types/core-infrastructure'
import { getServerSupabase } from '@/lib/supabaseServer'
import crypto from 'crypto'

export interface ComputeAvailabilityRequest {
  vendorId: string
  startTime: string // ISO 8601
  endTime: string // ISO 8601
  slotDuration?: number // Minutes
  includeConfidence?: boolean
  partnerId: string
}

export interface ComputeAvailabilityResult {
  success: boolean
  data?: VendorAvailability
  error?: string
}

/**
 * Compute availability for a vendor.
 */
export async function computeAvailability(
  request: ComputeAvailabilityRequest
): Promise<ComputeAvailabilityResult> {
  const startTime = Date.now()
  
  try {
    const supabase = getServerSupabase()
    
    // Get vendor configuration
    const { data: vendor, error: vendorError } = await supabase
      .from('profiles')
      .select('id, availability_mode, business_hours, timezone')
      .eq('id', request.vendorId)
      .maybeSingle()
    
    if (vendorError || !vendor) {
      return {
        success: false,
        error: 'VENDOR_NOT_FOUND',
      }
    }

    // Fetch availability slots from DB
    const { data: dbSlots, error: slotsError } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('provider_id', request.vendorId)
        .gte('end_time', request.startTime)
        .lte('start_time', request.endTime)
        .eq('is_available', true)

    if (slotsError) {
        console.error('Error fetching availability slots:', slotsError)
         // Continue with empty slots if error, or fail?
    }
    
    // Compute slots
    const slots = await computeSlots({
      vendorId: request.vendorId,
      startTime: request.startTime,
      endTime: request.endTime,
      slotDuration: request.slotDuration || 60,
      includeConfidence: request.includeConfidence || false,
      availabilityMode: vendor.availability_mode || 'subtractive',
      dbSlots: dbSlots || [],
      factors: {
        workingHours: {
          timezone: vendor.timezone || 'UTC',
          days: vendor.business_hours || {},
        },
        freeBusyBlocks: [], // TODO: Fetch from calendar
        buffers: {
          preBooking: 15, // minutes
          postBooking: 15, // minutes
        },
        slotDuration: request.slotDuration || 60,
        minimumNotice: 60, // minutes
        bookingHorizon: 90, // days
      },
    })
    
    // Generate version hash
    const versionInput = JSON.stringify({
      vendorId: request.vendorId,
      startTime: request.startTime,
      endTime: request.endTime,
      computedAt: new Date().toISOString(),
      slotCount: slots.length,
    })
    const computedVersion = crypto
      .createHash('sha256')
      .update(versionInput)
      .digest('hex')
      .substring(0, 16)
    
    const computationTimeMs = Date.now() - startTime
    
    const availability: VendorAvailability = {
      vendorId: request.vendorId,
      startTime: request.startTime,
      endTime: request.endTime,
      computedAt: new Date().toISOString(),
      computedVersion,
      slots,
      metadata: {
        confidenceThreshold: 0.6,
        computationTimeMs,
        calendarSource: 'native',
      },
    }
    
    return {
      success: true,
      data: availability,
    }
  } catch (error) {
    console.error('Error computing availability:', error)
    return {
      success: false,
      error: 'INTERNAL_ERROR',
    }
  }
}

/**
 * Compute availability slots.
 */
async function computeSlots(params: {
  vendorId: string
  startTime: string
  endTime: string
  slotDuration: number
  includeConfidence: boolean
  availabilityMode: string
  dbSlots: any[]
  factors: AvailabilityComputationFactors
}): Promise<AvailabilitySlot[]> {
  const slots: AvailabilitySlot[] = []
  const start = new Date(params.startTime)
  const end = new Date(params.endTime)
  const durationMs = params.slotDuration * 60 * 1000
  
  let current = new Date(start)
  
  while (current.getTime() + durationMs <= end.getTime()) {
    const slotStart = new Date(current)
    const slotEnd = new Date(current.getTime() + durationMs)
    
    let isAvailable = false
    let reasons: string[] = []

    // 1. Check against DB slots
    if (params.availabilityMode === 'additive') {
        // Additive: Must find an explicit "available" slot that covers this time
        const coveringSlot = params.dbSlots.find(s =>
            s.slot_type === 'available' &&
            new Date(s.start_time) <= slotStart &&
            new Date(s.end_time) >= slotEnd
        )
        if (coveringSlot) {
            isAvailable = true
            reasons.push('Explicitly available')
        } else {
            reasons.push('No available slot found (Additive mode)')
        }
    } else {
        // Subtractive: Available unless blocked OR outside business hours
        isAvailable = true // Default assumption

        // 1. Check Business Hours
        if (params.factors.workingHours && params.factors.workingHours.days) {
            const dayOfWeek = slotStart.toLocaleDateString('en-US', { weekday: 'long', timeZone: params.factors.workingHours.timezone })
            const daySchedule = params.factors.workingHours.days[dayOfWeek]

            if (!daySchedule || !daySchedule.isEnabled) {
                isAvailable = false
                reasons.push('Outside business hours')
            } else if (daySchedule.timeRanges) {
                 // Check if slot falls within any enabled range
                 // This is a simplified check assuming time ranges are in 'HH:mm' format local time
                 // Real implementation needs robust timezone handling for range comparison
                 // For now, we assume the input ranges map to local time of the slot
                 // Convert slot start/end to minutes from midnight in the vendor's timezone

                 const getMinutes = (d: Date) => {
                     const timeStr = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: params.factors.workingHours.timezone })
                     const [h, m] = timeStr.split(':').map(Number)
                     return h * 60 + m
                 }

                 const sStart = getMinutes(slotStart)
                 const sEnd = getMinutes(slotEnd)

                 let inRange = false
                 for (const range of daySchedule.timeRanges) {
                     const [rStartH, rStartM] = range.start.split(':').map(Number)
                     const [rEndH, rEndM] = range.end.split(':').map(Number)
                     const rStart = rStartH * 60 + rStartM
                     const rEnd = rEndH * 60 + rEndM

                     if (sStart >= rStart && sEnd <= rEnd) {
                         inRange = true
                         break
                     }
                 }

                 if (!inRange) {
                     isAvailable = false
                     reasons.push('Outside working hours')
                 }
            }
        }

        // 2. Check for blocks (only if still available)
        if (isAvailable) {
            const blockingSlot = params.dbSlots.find(s =>
                s.slot_type === 'blocked' &&
                !(new Date(s.end_time) <= slotStart || new Date(s.start_time) >= slotEnd) // Overlap check
            )

            if (blockingSlot) {
                isAvailable = false
                reasons.push('Blocked by provider')
            }
        }
    }

    // If available, add to list
    if (isAvailable) {
        const slot: AvailabilitySlot = {
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isAvailable: true,
        confidence: AvailabilityConfidence.HIGH,
        reasons: reasons,
        computedAt: new Date().toISOString(),
        computedVersion: 'v1',
        }

        slots.push(slot)
    }
    
    // Move to next slot
    current = new Date(current.getTime() + durationMs)
  }
  
  return slots
}
