import { NextResponse } from 'next/server'

export async function GET() {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bookiji//Maintenance Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:bookiji-maintenance@bookiji.test',
    'DTSTAMP:20250101T000000Z',
    'DTSTART:20300101T000000Z',
    'DTEND:20300101T010000Z',
    'SUMMARY:Bookiji Maintenance Window (Test)',
    'DESCRIPTION:Static calendar used for smoke tests.',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n')

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8'
    }
  })
}

