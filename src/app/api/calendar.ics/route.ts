import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('bookingId');

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
  }

  // In a real implementation, fetch booking details from database
  // For now, return a sample ICS file
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Bookiji//Booking Platform//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${bookingId}@bookiji.com
DTSTART:20241201T140000Z
DTEND:20241201T150000Z
SUMMARY:Appointment with Provider
DESCRIPTION:Service booking via Bookiji
LOCATION:Contact provider for details
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT1H
DESCRIPTION:Reminder: You have an appointment in 1 hour
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="booking-${bookingId}.ics"`,
    },
  });
}
