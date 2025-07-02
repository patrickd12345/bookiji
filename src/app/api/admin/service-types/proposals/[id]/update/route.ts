import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'

const schema = z.object({ action: z.enum(['approve', 'reject']), reviewerId: z.string().uuid().optional(), notes: z.string().optional() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseClient()
  const { id } = params

  try {
    const body = await req.json()
    const { action, reviewerId, notes } = schema.parse(body)

    const status = action === 'approve' ? 'approved' : 'rejected'
    const { error } = await supabase
      .from('service_type_proposals')
      .update({ status, reviewed_by: reviewerId, notes, reviewed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    if (action === 'approve') {
      // Fetch proposal label
      const { data: prop } = await supabase
        .from('service_type_proposals')
        .select('label,email,vendor_id')
        .eq('id', id)
        .single()

      if (prop?.label) {
        await supabase.from('service_types').upsert({ label: prop.label })
      }

      if (prop?.vendor_id) {
        await supabase.from('notifications').insert({
          user_id: prop.vendor_id,
          type: 'SYSTEM_MESSAGE',
          title: 'Service Type Approved',
          message: `Your proposed service type "${prop.label}" has been approved!`
        })
      }

      // notify vendor
      if (prop) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            recipient: prop.email || '',
            template: 'admin_alert',
            data: {
              type: 'Service Type Approved',
              details: `Your proposed service type "${prop.label}" has been approved!`
            },
            priority: 'normal'
          })
        }).catch(()=>{})
      }
    }

    if (action === 'reject') {
      // fetch label & email for rejection
      const { data: prop } = await supabase
        .from('service_type_proposals')
        .select('label,email,vendor_id')
        .eq('id', id)
        .single()

      if (prop) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'email',
            recipient: prop.email || '',
            template: 'admin_alert',
            data: {
              type: 'Service Type Rejected',
              details: `Your proposed service type "${prop.label}" has been rejected. Please contact support for more info.`
            },
            priority: 'normal'
          })
        }).catch(()=>{})
      }

      if (prop?.vendor_id) {
        await supabase.from('notifications').insert({
          user_id: prop.vendor_id,
          type: 'SYSTEM_MESSAGE',
          title: 'Service Type Rejected',
          message: `Your proposed service type "${prop.label}" has been rejected.`
        })
      }
    }

    // TODO: if approved, insert into service_types lookup table & notify vendor

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const msg = err?.issues ? err.issues.map((i: any) => i.message).join(', ') : err.message
    console.error('[service-types/update] error', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
} 