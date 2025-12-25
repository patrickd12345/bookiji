import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { getSupabaseConfig } from '@/config/supabase'
import { createErrorResponse, createSuccessResponse, ErrorCodes } from '@/lib/api/errorEnvelope'

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Payment configuration error',
      500,
      { service: 'stripe' },
      req.nextUrl.pathname
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20'
  })

  const config = getSupabaseConfig()

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
    return createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      'Not authenticated',
      401,
      undefined,
      req.nextUrl.pathname
    )
  }

  interface BookingRequestBody {
    service_id?: string
    customer_id?: string
    [key: string]: unknown
  }
  let body: BookingRequestBody
  try {
    body = await req.json()
  } catch {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid JSON payload',
      400,
      { field: 'body' },
      req.nextUrl.pathname
    )
  }

  const { providerId, serviceId, startTime, endTime, amountUSD, idempotency_key } = body

  if (!providerId || !serviceId || !startTime || !endTime || amountUSD === undefined) {
    const missingFields = []
    if (!providerId) missingFields.push('providerId')
    if (!serviceId) missingFields.push('serviceId')
    if (!startTime) missingFields.push('startTime')
    if (!endTime) missingFields.push('endTime')
    if (amountUSD === undefined) missingFields.push('amountUSD')
    
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Missing required fields',
      400,
      { missingFields },
      req.nextUrl.pathname
    )
  }

  // Generate idempotency key if not provided (for duplicate protection)
  const idempotencyKey = idempotency_key || `booking_${user.id}_${providerId}_${startTime}_${Date.now()}`

  if (!config.secretKey) {
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Supabase service key not configured',
      500,
      { service: 'supabase' },
      req.nextUrl.pathname
    )
  }

  // Supabase insert (service role) - check for duplicate first
  const supabase = createClient(config.url, config.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Check if booking with same idempotency key already exists
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id, status, stripe_payment_intent_id')
    .eq('idempotency_key', idempotencyKey)
    .single()

  if (existingBooking) {
    // Duplicate request - return existing booking
    return createSuccessResponse({
      booking: existingBooking,
      clientSecret: null, // Payment intent already exists
      duplicate: true,
    })
  }

  const amountNumber = Number(amountUSD)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid amount',
      400,
      { field: 'amountUSD', value: amountUSD },
      req.nextUrl.pathname
    )
  }

  const amountCents = Math.round(amountNumber * 100)

  // Stripe PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata: {
      providerId: String(providerId),
      serviceId: String(serviceId),
      userId: user.id,
      idempotency_key: idempotencyKey
    }
  })

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      provider_id: providerId,
      service_id: serviceId,
      user_id: user.id,
      start_time: startTime,
      end_time: endTime,
      stripe_payment_intent_id: intent.id,
      idempotency_key: idempotencyKey,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to create booking',
      500,
      { databaseError: error.message },
      req.nextUrl.pathname
    )
  }

  return createSuccessResponse({
    booking,
    clientSecret: intent.client_secret,
  })
}
