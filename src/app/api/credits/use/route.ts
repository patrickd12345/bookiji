import { NextRequest, NextResponse } from 'next/server'
import { useCredits, getUserCredits } from '@/lib/database'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { userId, bookingId, amountCents, description } = await request.json()

    if (!userId || !bookingId || !amountCents) {
      return NextResponse.json({ 
        error: 'User ID, booking ID, and amount are required' 
      }, { status: 400 })
    }

    console.log('💰 Using credits for booking:', { userId, bookingId, amountCents })

    // Check if user has sufficient credits
    const creditsResult = await getUserCredits(userId)
    if (!creditsResult.success || !creditsResult.credits) {
      throw new Error('Failed to fetch user credits')
    }

    if (creditsResult.credits.balance_cents < amountCents) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: amountCents,
        available: creditsResult.credits.balance_cents,
        success: false
      }, { status: 400 })
    }

    // Use the credits
    const useResult = await useCredits(
      userId, 
      amountCents, 
      description || `Payment for booking ${bookingId}`, 
      bookingId
    )

    if (!useResult.success) {
      throw new Error(useResult.error)
    }

    // Update booking to mark as paid with credits
    const { error: bookingUpdateError } = await supabase
      .from('bookings')
      .update({
        commitment_fee_paid: true,
        payment_status: 'paid',
        payment_intent_id: `credits_${Date.now()}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (bookingUpdateError) {
      console.error('Error updating booking after credit payment:', bookingUpdateError)
      // Note: Credits have already been deducted, so we should not fail here
      // In production, this would need proper transaction handling
    }

    console.log('💰 Credits payment successful for booking:', bookingId)

    return NextResponse.json({
      success: true,
      creditsUsed: amountCents,
      remainingBalance: creditsResult.credits.balance_cents - amountCents,
    })

  } catch (error) {
    console.error('❌ Error using credits:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to use credits',
      success: false
    }, { status: 500 })
  }
} 