import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { getSupabaseConfig } from '@/config/supabase'
import { isTruthyEnv } from '@/lib/env/isTruthyEnv'
import { SchedulingDisabledError, assertSchedulingEnabled } from '@/lib/guards/schedulingKillSwitch'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Standardized error response helper
function createErrorResponse(
  error: string,
  status: number,
  code?: string,
  hint?: string,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      error,
      ...(code && { code }),
      ...(hint && { hint }),
      ...(details && typeof details === 'object' && details !== null ? { details } : details ? { details } : {})
    },
    { status }
  )
}

export async function POST(req: NextRequest) {
  try {
  const isE2E = isTruthyEnv(process.env.E2E) || isTruthyEnv(process.env.NEXT_PUBLIC_E2E)
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey && !isE2E) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return createErrorResponse('Payment configuration error', 500, 'PAYMENT_CONFIG_ERROR')
  }

  const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, {
        apiVersion: '2024-06-20'
      })
    : null

  const config = getSupabaseConfig()
  if (!config.secretKey) {
    return createErrorResponse('Supabase service key not configured', 500, 'CONFIG_ERROR')
  }

  // Service role client for profile lookup + booking insert
  const supabase = createClient(config.url, config.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Invariant INV-5 (Admin & Ops): booking endpoints must enforce the scheduling kill switch.
  try {
    await assertSchedulingEnabled(supabase as SupabaseClient<Database>)
  } catch (error) {
    if (error instanceof SchedulingDisabledError) {
      return createErrorResponse(error.message, 503, error.code)
    }
    throw error
  }

  // Require auth session from Supabase cookies
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    config.url,
    config.publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (_error) {
            // The `setAll` method was called from a Server Component or Route Handler.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        }
      }
    }
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

  if (authError || !user) {
    if (!isE2E) {
      console.warn('Booking create auth failed', { authError })
      return createErrorResponse('Not authenticated', 401, 'AUTH_REQUIRED', 'Please log in to create a booking')
    }
    // E2E mode: return deterministic stub without touching DB/RLS (keeps smoke tests stable)
    return NextResponse.json({
      booking: {
        id: 'e2e-proof',
        status: 'pending',
        state: 'quoted'
      },
      clientSecret: 'pi_e2e_fallback_secret'
    })
  }

  interface BookingRequestBody {
    service_id?: string
    customer_id?: string
    idempotencyKey?: string
    [key: string]: unknown
  }
  let body: BookingRequestBody
  try {
    body = await req.json()
  } catch {
    return createErrorResponse('Invalid JSON payload', 400, 'INVALID_JSON', 'Request body must be valid JSON')
  }

  const { providerId, serviceId, startTime, endTime, amountUSD, customerId, vendorAuthId, isVendorCreated, idempotencyKey } = body

  if (!providerId || !serviceId || !startTime || !endTime || amountUSD === undefined) {
    return createErrorResponse(
      'Missing required fields',
      400,
      'VALIDATION_ERROR',
      'Please provide: providerId, serviceId, startTime, endTime, and amountUSD'
    )
  }

  // Check if this is a vendor-created booking (payment-free)
  const vendorCreated = isVendorCreated === true || isVendorCreated === 'true'
  
  // For vendor-created bookings, verify the user is the vendor
  if (vendorCreated) {
    // Get vendor profile to verify ownership
    const { data: vendorProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!vendorProfile || vendorProfile.role !== 'vendor' || vendorProfile.id !== providerId) {
      return createErrorResponse(
        'Only the vendor can create vendor bookings',
        403,
        'FORBIDDEN',
        'Vendor-created bookings must be created by the vendor themselves'
      )
    }
  }

  // Invariant VI-1: No Past Booking
  // Validate that start time is in the future (strict: start_time > now())
  const now = new Date()
  const bookingStart = new Date(startTime as string)
  
  if (bookingStart <= now) {
    return createErrorResponse(
      'Cannot create booking in the past',
      400,
      'VALIDATION_ERROR',
      'Booking start time must be in the future'
    )
  }

  const amountNumber = Number(amountUSD)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return createErrorResponse(
      'Invalid amount',
      400,
      'VALIDATION_ERROR',
      'Amount must be a positive number'
    )
  }

  const amountCents = Math.round(amountNumber * 100)
  const authUserId = user?.id || vendorAuthId || null

  // Resolve profile ids (customer/provider) from auth ids
  let customerProfileId: string | null = null
  if (customerId) {
    customerProfileId = customerId as string
  } else if (authUserId) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    customerProfileId = profileRow?.id ?? null
  }

  const providerProfileId = providerId as string | null

  if (!customerProfileId && !isE2E) {
    return createErrorResponse(
      'Customer profile not found',
      400,
      'PROFILE_NOT_FOUND',
      'Please ensure you are logged in with a valid account'
    )
  }

  const resolvedCustomerId = customerProfileId || providerProfileId || 'e2e-customer'
  const resolvedProviderId = providerProfileId || resolvedCustomerId

  // Check for duplicate booking using idempotency key or booking parameters
  // Duplicate detection: same customer + provider + service + start_time within 5 minutes
  const duplicateWindowStart = new Date(bookingStart.getTime() - 5 * 60 * 1000) // 5 minutes before
  const duplicateWindowEnd = new Date(bookingStart.getTime() + 5 * 60 * 1000) // 5 minutes after

  if (idempotencyKey) {
    // Check by idempotency key first (most reliable)
    const { data: existingByKey } = await supabase
      .from('bookings')
      .select('id, customer_id, provider_id, service_id, start_time, stripe_payment_intent_id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (existingByKey) {
      // Return existing booking (idempotent response)
      const existingIntent = existingByKey.stripe_payment_intent_id
        ? await (stripe?.paymentIntents.retrieve(existingByKey.stripe_payment_intent_id).catch(() => null))
        : null

      return NextResponse.json({
        booking: existingByKey,
        clientSecret: existingIntent?.client_secret || null,
        vendorCreated: vendorCreated,
        requiresPayment: !vendorCreated,
        duplicate: true
      }, { status: 200 })
    }
  }

  // Check for duplicate by booking parameters (within 5 minute window)
  const { data: existingByParams } = await supabase
    .from('bookings')
    .select('id, customer_id, provider_id, service_id, start_time, stripe_payment_intent_id, idempotency_key')
    .eq('customer_id', resolvedCustomerId)
    .eq('provider_id', resolvedProviderId)
    .eq('service_id', serviceId)
    .gte('start_time', duplicateWindowStart.toISOString())
    .lte('start_time', duplicateWindowEnd.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingByParams && existingByParams.length > 0) {
    const existing = existingByParams[0]
    // If booking was created within last 5 minutes, return it as duplicate
    const existingIntent = existing.stripe_payment_intent_id
      ? await (stripe?.paymentIntents.retrieve(existing.stripe_payment_intent_id).catch(() => null))
      : null

    return NextResponse.json({
      booking: existing,
      clientSecret: existingIntent?.client_secret || null,
      vendorCreated: vendorCreated,
      requiresPayment: !vendorCreated,
      duplicate: true
    }, { status: 200 })
  }

  // For vendor-created bookings, skip payment intent creation
  let intent: { id: string; client_secret: string | null } | null = null
  
  if (!vendorCreated) {
    // Regular customer booking - create payment intent
    intent = stripe
      ? await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          metadata: {
            providerId: String(resolvedProviderId),
            serviceId: String(serviceId),
            customerId: resolvedCustomerId
          }
        })
      : {
          id: 'pi_e2e_fallback',
          client_secret: 'pi_e2e_fallback_secret'
        }
  } else {
    // Vendor-created booking - no payment required
    intent = {
      id: 'vendor_created_no_payment',
      client_secret: null
    }
  }

  // Generate idempotency key if not provided
  const finalIdempotencyKey = idempotencyKey || `booking_${resolvedCustomerId}_${resolvedProviderId}_${serviceId}_${startTime}_${Date.now()}`

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      customer_id: resolvedCustomerId,
      provider_id: resolvedProviderId,
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
      state: vendorCreated ? 'quoted' : 'quoted', // Both start as quoted
      total_amount: amountNumber,
      vendor_created: vendorCreated,
      vendor_created_by: vendorCreated ? resolvedProviderId : null,
      stripe_payment_intent_id: vendorCreated ? null : intent.id,
      idempotency_key: finalIdempotencyKey
    })
    .select()
    .single()

  if (error) {
    // Check if it's a unique constraint violation on idempotency_key
    if (error.code === '23505' && error.message.includes('idempotency_key')) {
      // Duplicate idempotency key - fetch existing booking
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id, customer_id, provider_id, service_id, start_time, stripe_payment_intent_id')
        .eq('idempotency_key', finalIdempotencyKey)
        .maybeSingle()

      if (existingBooking) {
        const existingIntent = existingBooking.stripe_payment_intent_id
          ? await (stripe?.paymentIntents.retrieve(existingBooking.stripe_payment_intent_id).catch(() => null))
          : null

        return NextResponse.json({
          booking: existingBooking,
          clientSecret: existingIntent?.client_secret || null,
          vendorCreated: vendorCreated,
          requiresPayment: !vendorCreated,
          duplicate: true
        }, { status: 200 })
      }
    }
    return createErrorResponse(
      error.message || 'Failed to create booking',
      500,
      'DATABASE_ERROR',
      'An error occurred while saving your booking. Please try again.'
    )
  }

  return NextResponse.json({
    booking,
    clientSecret: intent.client_secret,
    vendorCreated: vendorCreated,
    requiresPayment: !vendorCreated
  })
  } catch (err) {
    console.error('Booking create exception', err)
    return createErrorResponse(
      err instanceof Error ? err.message : 'Internal error',
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred. Please try again later.'
    )
  }
}
