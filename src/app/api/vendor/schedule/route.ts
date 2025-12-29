import { getServerSupabase } from '@/lib/supabaseServer';
import { assertVendorHasActiveSubscription, SubscriptionRequiredError } from '@/lib/guards/subscriptionGuard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { NextRequest, NextResponse } from 'next/server';

type TimeRange = {
    start: string;
    end: string;
};

type DaySchedule = {
    isEnabled: boolean;
    timeRanges: TimeRange[];
};

type Schedule = {
    [key: string]: DaySchedule;
};

const DAY_MAPPING: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const parseTime = (time: unknown): { value: string; minutes: number } | null => {
  if (typeof time !== 'string') return null
  const match = time.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return { value: time, minutes: hours * 60 + minutes }
}

type ValidatedScheduleEntry = {
  dayKey: keyof typeof DAY_MAPPING
  isEnabled: boolean
  ranges: Array<{ start: string; end: string; startMinutes: number; endMinutes: number }>
}

const validateSchedule = (schedule: unknown): { error?: string; entries?: ValidatedScheduleEntry[] } => {
  if (!isRecord(schedule)) {
    return { error: 'Invalid schedule format' }
  }

  const entries: ValidatedScheduleEntry[] = []

  for (const [day, rawDaySchedule] of Object.entries(schedule)) {
    if (!Object.prototype.hasOwnProperty.call(DAY_MAPPING, day)) {
      return { error: `Invalid day: ${day}` }
    }

    if (
      !isRecord(rawDaySchedule) ||
      typeof rawDaySchedule.isEnabled !== 'boolean' ||
      !Array.isArray(rawDaySchedule.timeRanges)
    ) {
      return { error: 'Invalid schedule format' }
    }

    const ranges: Array<{ start: string; end: string; startMinutes: number; endMinutes: number }> = []
    for (const range of rawDaySchedule.timeRanges) {
      const parsedStart = parseTime((range as TimeRange | undefined)?.start)
      const parsedEnd = parseTime((range as TimeRange | undefined)?.end)

      if (!parsedStart || !parsedEnd) {
        return { error: 'Invalid time format. Use HH:MM (24h).' }
      }

      ranges.push({ start: parsedStart.value, end: parsedEnd.value, startMinutes: parsedStart.minutes, endMinutes: parsedEnd.minutes })
    }

    if (rawDaySchedule.isEnabled && ranges.length > 0) {
      const sorted = [...ranges].sort((a, b) => a.startMinutes - b.startMinutes)
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i]
        if (current.startMinutes >= current.endMinutes) {
          return { error: 'Invalid schedule: overlapping or invalid time intervals detected.' }
        }

        const next = sorted[i + 1]
        if (next && current.endMinutes > next.startMinutes) {
          return { error: 'Invalid schedule: overlapping or invalid time intervals detected.' }
        }
      }
    }

    entries.push({ dayKey: day as keyof typeof DAY_MAPPING, isEnabled: rawDaySchedule.isEnabled, ranges })
  }

  return { entries }
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = await req.json().catch(() => null)

    if (!isRecord(parsedBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { providerId, schedule }: { providerId?: string; schedule?: Schedule } = parsedBody as {
      providerId?: string
      schedule?: Schedule
    }

    if (!providerId || !schedule) {
      return NextResponse.json({ error: 'Missing providerId or schedule' }, { status: 400 });
    }

    const validation = validateSchedule(schedule)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Invariant III-1: Server-side subscription gating
    try {
      await assertVendorHasActiveSubscription(providerId);
    } catch (error: unknown) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // For simplicity, we'll delete all existing schedules for the provider
    // and insert the new ones. This is easier than trying to diff the changes.
    const { error: deleteError } = await supabase
      .from('provider_schedules')
      .delete()
      .eq('profile_id', providerId);

    if (deleteError) {
      console.error('Error deleting old schedule:', deleteError);
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }

    const scheduleToInsert: Array<{
        profile_id: string;
        day_of_week: number;
        start_time: string;
        end_time: string;
    }> = [];
    for (const entry of validation.entries ?? []) {
      if (entry.isEnabled && entry.ranges.length > 0) {
        for (const range of entry.ranges) {
          scheduleToInsert.push({
            profile_id: providerId,
            day_of_week: DAY_MAPPING[entry.dayKey],
            start_time: range.start,
            end_time: range.end,
          })
        }
      }
    }

    if (scheduleToInsert.length > 0) {
        const { error: insertError } = await supabase
        .from('provider_schedules')
        .insert(scheduleToInsert);

        if (insertError) {
            console.error('Error inserting new schedule:', insertError);
            return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
        }
    }


    return NextResponse.json({ message: 'Schedule saved successfully' });
  } catch (error) {
    console.error('Error updating vendor schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
} 