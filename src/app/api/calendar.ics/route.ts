import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Generate a sample ICS calendar entry
    const now = new Date();
    const eventStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour later

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bookiji//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${bookingId}@bookiji.com`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${eventStart.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${eventEnd.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:Bookiji Appointment - ${bookingId}`,
      'DESCRIPTION:Your Bookiji appointment has been scheduled.',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="booking.ics"'
      }
    });
  } catch (error) {
    console.error('Error generating calendar ICS:', error);
    return NextResponse.json({ error: 'Failed to generate calendar' }, { status: 500 });
  }
}

