import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 })
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
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { providerId, serviceId, startTime, endTime, amountUSD } = body

  if (!providerId || !serviceId || !startTime || !endTime || amountUSD === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const amountNumber = Number(amountUSD)
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const amountCents = Math.round(amountNumber * 100)

  // Stripe PaymentIntent
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata: {
      providerId: String(providerId),
      serviceId: String(serviceId),
      userId: user.id
    }
  })

  if (!config.secretKey) {
    return NextResponse.json({ error: 'Supabase service key not configured' }, { status: 500 })
  }

  // Supabase insert (service role)
  const supabase = createClient(config.url, config.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
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
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    booking,
    clientSecret: intent.client_secret
  })
}
