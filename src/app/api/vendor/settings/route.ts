import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

export async function POST(request: NextRequest) {
  try {
    const { providerId, availabilityMode } = await request.json()

    if (!providerId || !availabilityMode) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId and availabilityMode' },
        { status: 400 }
      )
    }

    // Validate availability mode
    if (!['subtractive', 'additive'].includes(availabilityMode)) {
      return NextResponse.json(
        { error: 'Invalid availability mode. Must be "subtractive" or "additive"' },
        { status: 400 }
      )
    }

    // Update the provider's availability mode
    const { error } = await supabase
      .from('profiles')
      .update({ availability_mode: availabilityMode })
      .eq('id', providerId)

    if (error) {
      console.error('Error updating availability mode:', error)
      return NextResponse.json(
        { error: 'Failed to update availability mode' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: 'Availability mode updated successfully',
      availabilityMode 
    })

  } catch (error) {
    console.error('Error in vendor settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 