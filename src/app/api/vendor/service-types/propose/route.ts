import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'

const schema = z.object({
  proposedServiceType: z.string().min(3).max(100),
  vendorId: z.string().uuid(),
  businessName: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().optional()
})

export async function POST(req: NextRequest) {
  const supabase = createSupabaseClient()

  try {
    const body = await req.json()
    const { proposedServiceType, vendorId, businessName, email, phone } = schema.parse(body)

    const { data, error } = await supabase
      .from('service_type_proposals')
      .insert({
        vendor_id: vendorId,
        label: proposedServiceType,
        business_name: businessName,
        email,
        phone,
        status: 'pending'
      })
      .select('id, status')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, proposalId: data.id, status: data.status })
  } catch (error) {
    console.error('Error creating service type proposal:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
} 