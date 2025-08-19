import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabaseServerClient'

function icsEscape(s: string) {
  return s.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')
}

export async function GET(_: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const resolvedParams = await params
  const supabase = getSupabaseServerClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, service_name, location_text, start_time, end_time')
    .eq('id', resolvedParams.bookingId)
    .single()

  if (error || !booking) {
    return new NextResponse('Not found', { status: 404 })
  }

  const dtStart = new Date(booking.start_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const dtEnd   = new Date(booking.end_time).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const uid = `${booking.id}@bookiji.com`
  const summary = icsEscape(booking.service_name || 'Booked Service')
  const location = icsEscape(booking.location_text || '')

  const body =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bookiji//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtStart}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${summary}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="booking-${booking.id}.ics"`
    }
  })
}