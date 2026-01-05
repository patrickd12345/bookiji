import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      business_name,
      contact_name,
      phone,
      email,
      description,
      address,
      hours,
      specialties,
      availability_method
    } = body

    // Validation
    if (!business_name || !email || !specialties?.length) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. Update Profile
    // We map availability_method ('calendar' | 'basic') to availability_mode ('additive' | 'subtractive')
    const availabilityMode = availability_method === 'calendar' ? 'additive' : 'subtractive'

    const { error: profileError } = await supabase.from('profiles').update({
      full_name: contact_name,
      email: email,
      phone: phone,
      role: 'vendor', // Promote to vendor
      business_name: business_name,
      business_description: description,
      business_address: address,
      business_hours: hours,
      availability_mode: availabilityMode,

      onboarding_step: 'complete',
      onboarding_data: {}, // Clear draft data
      updated_at: new Date().toISOString()
    }).eq('id', user.id)

    if (profileError) throw profileError

    // 2. Update Specialties
    // Delete old ones to be safe (re-submission)
    await supabase.from('vendor_specialties').delete().eq('app_user_id', user.id)

    const specialtyInserts = specialties.map((specialty: { id: string, name: string }, index: number) => ({
      app_user_id: user.id,
      specialty_id: specialty.id,
      is_primary: index === 0
    }))

    const { error: specialtyError } = await supabase
      .from('vendor_specialties')
      .insert(specialtyInserts)

    if (specialtyError) throw specialtyError

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
