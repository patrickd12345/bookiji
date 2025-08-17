export interface CalendarEvent {
  summary: string
  description: string
  location: string
  startTime: Date
  endTime: Date
  organizer?: {
    name: string
    email?: string
  }
  attendees?: Array<{
    name: string
    email: string
  }>
}

export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const escapeText = (text: string): string => {
    return text
      .replace(/[\\;,]/g, '\\$&')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
  }
  
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bookiji//Booking Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@bookiji.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    event.organizer ? `ORGANIZER;CN=${escapeText(event.organizer.name)}${event.organizer.email ? `:mailto:${event.organizer.email}` : ''}` : '',
    ...(event.attendees?.map(attendee => 
      `ATTENDEE;CN=${escapeText(attendee.name)}:mailto:${attendee.email}`
    ) || []),
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
  
  return ics
}

export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.summary,
    dates: `${event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${event.endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    details: event.description,
    location: event.location,
    ...(event.attendees?.[0]?.email && { add: event.attendees[0].email })
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function generateAppleCalendarLink(event: CalendarEvent): string {
  // Apple Calendar uses a custom URL scheme - return ICS data URL
  return `data:text/calendar;charset=utf8,${encodeURIComponent(generateICS(event))}`
}

export function generateOutlookCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.summary,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
    body: event.description,
    location: event.location
  })
  
  return `https://outlook.live.com/owa/?${params.toString()}`
}

export function downloadICS(event: CalendarEvent, filename?: string): void {
  const ics = generateICS(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${event.summary.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
