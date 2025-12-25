/**
 * ICS (iCalendar) export utility for vendor schedules
 */

export interface CalendarEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  start: Date
  end: Date
  allDay?: boolean
  rrule?: string // Recurrence rule (RFC 5545)
}

/**
 * Generate ICS file content from calendar events
 * @param events Array of calendar events
 * @param calendarName Name of the calendar
 * @returns ICS file content as string
 */
export function generateICS(events: CalendarEvent[], calendarName: string = 'Bookiji Schedule'): string {
  const now = new Date()
  const timestamp = formatDateUTC(now)

  let ics = `BEGIN:VCALENDAR\r\n`
  ics += `VERSION:2.0\r\n`
  ics += `PRODID:-//Bookiji//Booking Platform//EN\r\n`
  ics += `CALSCALE:GREGORIAN\r\n`
  ics += `METHOD:PUBLISH\r\n`
  ics += `X-WR-CALNAME:${escapeText(calendarName)}\r\n`
  ics += `X-WR-TIMEZONE:UTC\r\n`

  for (const event of events) {
    ics += `BEGIN:VEVENT\r\n`
    ics += `UID:${event.uid}\r\n`
    ics += `DTSTAMP:${timestamp}\r\n`
    ics += `DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${formatDateUTC(event.start, event.allDay)}\r\n`
    ics += `DTEND${event.allDay ? ';VALUE=DATE' : ''}:${formatDateUTC(event.end, event.allDay)}\r\n`
    ics += `SUMMARY:${escapeText(event.summary)}\r\n`

    if (event.description) {
      ics += `DESCRIPTION:${escapeText(event.description)}\r\n`
    }

    if (event.location) {
      ics += `LOCATION:${escapeText(event.location)}\r\n`
    }

    if (event.rrule) {
      ics += `RRULE:${event.rrule}\r\n`
    }

    ics += `STATUS:CONFIRMED\r\n`
    ics += `END:VEVENT\r\n`
  }

  ics += `END:VCALENDAR\r\n`

  return ics
}

/**
 * Format date to UTC string for ICS format
 * @param date Date object
 * @param allDay Whether this is an all-day event
 * @returns Formatted date string (YYYYMMDDTHHmmssZ or YYYYMMDD)
 */
function formatDateUTC(date: Date, allDay: boolean = false): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  if (allDay) {
    return `${year}${month}${day}`
  }

  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Escape text for ICS format (line breaks, commas, semicolons)
 * @param text Text to escape
 * @returns Escaped text
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/**
 * Download ICS file
 * @param icsContent ICS file content
 * @param filename Filename for download (default: 'schedule.ics')
 */
export function downloadICS(icsContent: string, filename: string = 'schedule.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
