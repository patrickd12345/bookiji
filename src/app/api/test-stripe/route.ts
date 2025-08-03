import { NextResponse } from 'next/server'
import { stripe } from '../../../../lib/stripe'

export async function GET() {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({
        success: true,
        configured: false,
        mode: 'mock',
        message: 'Stripe running in mock mode - no real payments possible',
        details: 'Configure STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for live payments',
        timestamp: new Date().toISOString()
      })
    }

    // Test Stripe connection by listing payment methods (empty list is fine)
    const paymentMethods = await stripe.paymentMethods.list({ limit: 1 })

    return NextResponse.json({
      success: true,
      configured: true,
      mode: 'live',
      message: 'Stripe connection successful - live payments enabled',
      paymentMethodsCount: paymentMethods.data.length,
      apiVersion: '2024-06-20',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Stripe test error:', error)
    return NextResponse.json({
      success: false,
      configured: false,
      mode: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 