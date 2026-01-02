import { generateIcsUid } from '@/lib/calendar-sync/ics-uid';

export type BookingMinimal = {
  id: string;
  provider_id: string;
  start_time: string | Date;
  end_time: string | Date;
  notes?: string | null;
  service_name?: string | null;
  location?: string | null;
  status?: string | null;
};

export type CalendarEventPayload = {
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  ics_uid: string;
};

export function mapBookingToCalendarEvent(booking: BookingMinimal, context: { calendar_provider: string }): CalendarEventPayload {
  const start = booking.start_time instanceof Date ? booking.start_time : new Date(booking.start_time);
  const end = booking.end_time instanceof Date ? booking.end_time : new Date(booking.end_time);

  // Title: deterministic and minimal
  const service = booking.service_name ? booking.service_name : 'Appointment';
  const title = `Booking: ${service}`;

  // Description: deterministic, minimal PII (no tokens)
  const descriptionParts = [`Booking ID: ${booking.id}`];
  if (booking.notes) {
    // sanitize notes: remove newlines and long tokens
    const sanitized = String(booking.notes).replace(/\s+/g, ' ').slice(0, 1000);
    descriptionParts.push(`Notes: ${sanitized}`);
  }

  const description = descriptionParts.join(' | ');

  const ics_uid = generateIcsUid(booking.id, booking.provider_id, context.calendar_provider);

  const payload: CalendarEventPayload = {
    start: new Date(start.toISOString()),
    end: new Date(end.toISOString()),
    title,
    description,
    location: booking.location ?? undefined,
    ics_uid,
  };

  return payload;
}

