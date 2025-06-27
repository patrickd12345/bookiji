import { NextResponse } from 'next/server'
import { stripe } from '../../../../lib/stripe'

export async function GET() {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({
        success: false,
        message: 'Stripe not configured',
        configured: false,
        details: 'Missing STRIPE_SECRET_KEY environment variable'
      })
    }

    // Test Stripe connection by listing payment methods (empty list is fine)
    const paymentMethods = await stripe.paymentMethods.list({ limit: 1 })

    return NextResponse.json({
      success: true,
      configured: true,
      message: 'Stripe connection successful',
      paymentMethodsCount: paymentMethods.data.length,
      apiVersion: '2024-06-20',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Stripe test error:', error)
    return NextResponse.json({
      success: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 