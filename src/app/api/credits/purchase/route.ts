import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '../../../../../lib/stripe'
import { addCredits, getCreditPackages } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { userId, packageId, customAmount } = await request.json()

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('💳 Creating credit purchase for user:', userId)

    let amountCents: number
    let creditsCents: number
    let description: string

    if (packageId) {
      // Purchase predefined package
      const packagesResult = await getCreditPackages()
      if (!packagesResult.success || !packagesResult.packages) {
        throw new Error('Failed to fetch credit packages')
      }

      const selectedPackage = packagesResult.packages.find(p => p.id === packageId)
      if (!selectedPackage) {
        throw new Error('Credit package not found')
      }

      amountCents = selectedPackage.price_cents
      creditsCents = selectedPackage.credits_cents + (selectedPackage.bonus_credits_cents || 0)
      description = `Purchased ${selectedPackage.name}`
    } else if (customAmount) {
      // Custom amount purchase (1:1 ratio, $1 = 100 credits)
      amountCents = customAmount * 100 // Convert dollars to cents
      creditsCents = amountCents // 1 cent = 1 credit
      description = `Custom credit purchase $${customAmount}`
    } else {
      return NextResponse.json({ 
        error: 'Either packageId or customAmount is required' 
      }, { status: 400 })
    }

    if (!stripe) {
      // Mock payment for development
      console.warn('Stripe not configured - using mock payment')
      
      const result = await addCredits(userId, creditsCents, description, 'purchase', `mock_${Date.now()}`)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      return NextResponse.json({
        success: true,
        mock: true,
        creditsAdded: creditsCents,
        amountCharged: amountCents,
      })
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      description: description,
      metadata: {
        user_id: userId,
        credits_cents: creditsCents.toString(),
        transaction_type: 'credit_purchase',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    console.log('💳 Credit purchase payment intent created:', paymentIntent.id)

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      creditsCents,
      description,
    })

  } catch (error) {
    console.error('❌ Error creating credit purchase:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create credit purchase',
      success: false
    }, { status: 500 })
  }
} 