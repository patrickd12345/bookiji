import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { addCredits, getCreditPackages } from './database'
import { CreditPackage } from '../types/global.d'
import { stripe as defaultStripe } from '@/lib/stripe'

export interface CreditsPurchaseRequest {
  userId: string
  packageId?: string
  customAmount?: number
}

export interface CreditsPurchaseResponse {
  success: boolean
  mock?: boolean
  creditsAdded?: number
  amountCharged?: number
  clientSecret?: string
  paymentIntentId?: string
  amountCents?: number
  creditsCents?: number
  description?: string
  error?: string
}

export interface CreditsPurchaseHandler {
  handle(request: NextRequest): Promise<NextResponse<CreditsPurchaseResponse>>
}

// Define proper types for the function parameters
interface AddCreditsFunction {
  (userId: string, creditsCents: number, description: string, transactionType?: 'purchase' | 'bonus' | 'refund', transactionId?: string): Promise<{ success: boolean; error?: string }>;
}

interface GetCreditPackagesFunction {
  (): Promise<{ success: boolean; packages?: CreditPackage[]; error?: string }>;
}

export class CreditsPurchaseHandlerImpl implements CreditsPurchaseHandler {
  constructor(
    private stripe: Stripe | null,
    private addCredits: AddCreditsFunction,
    private getCreditPackages: GetCreditPackagesFunction
  ) {}

  async handle(request: NextRequest): Promise<NextResponse<CreditsPurchaseResponse>> {
    try {
      const { userId, packageId, customAmount }: CreditsPurchaseRequest = await request.json()

      if (!userId) {
        return NextResponse.json({ 
          error: 'User ID is required',
          success: false
        }, { status: 400 })
      }

      console.log('💳 Creating credit purchase for user:', userId)

      let amountCents: number
      let creditsCents: number
      let description: string

      if (packageId) {
        // Purchase predefined package
        const packagesResult = await this.getCreditPackages()
        if (!packagesResult.success || !packagesResult.packages) {
          throw new Error('Failed to fetch credit packages')
        }

        const selectedPackage: CreditPackage | undefined = packagesResult.packages.find((p: CreditPackage): boolean => p.id === packageId)
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
          error: 'Either packageId or customAmount is required',
          success: false
        }, { status: 400 })
      }

      if (!this.stripe) {
        // Mock payment for development
        console.warn('Stripe not configured - using mock payment')
        
        const result: { success: boolean; error?: string } = await this.addCredits(userId, creditsCents, description, 'purchase', `mock_${Date.now()}`)
        
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
      const paymentIntent: Stripe.PaymentIntent = await this.stripe.paymentIntents.create({
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
        clientSecret: paymentIntent.client_secret || '',
        paymentIntentId: paymentIntent.id,
        amountCents,
        creditsCents,
        description,
      })

    } catch (error: unknown) {
      console.error('❌ Error creating credit purchase:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to create credit purchase',
        success: false
      }, { status: 500 })
    }
  }
}

export function createCreditsPurchaseHandler(): CreditsPurchaseHandler {
  return new CreditsPurchaseHandlerImpl(defaultStripe, addCredits, getCreditPackages)
} 