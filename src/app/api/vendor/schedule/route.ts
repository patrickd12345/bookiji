import { getServerSupabase } from '@/lib/supabaseServer';
import { hasActiveSubscription } from '@/lib/services/subscriptionGate';

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

const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

const checkForOverlaps = (timeRanges: { start: string; end: string }[]): boolean => {
    if (timeRanges.length <= 1) return false;

    const rangesInMinutes = timeRanges.map(r => ({
        start: timeToMinutes(r.start),
        end: timeToMinutes(r.end)
    }));
    
    for (const range of rangesInMinutes) {
        if (range.start >= range.end) return true; // Invalid range
    }

    rangesInMinutes.sort((a, b) => a.start - b.start);

    for (let i = 0; i < rangesInMinutes.length - 1; i++) {
        if (rangesInMinutes[i].end > rangesInMinutes[i + 1].start) {
            return true; // Overlap
        }
    }

    return false;
};

export async function POST(req: NextRequest) {
  try {
    const { providerId, schedule }: { providerId: string; schedule: Schedule } = await req.json();

    if (!providerId || !schedule) {
      return NextResponse.json({ error: 'Missing providerId or schedule' }, { status: 400 });
    }

    // CRITICAL: Enforce subscription gating - vendors must have active subscription to schedule
    const hasSubscription = await hasActiveSubscription(providerId);
    if (!hasSubscription) {
      return NextResponse.json(
        { 
          error: 'Active subscription required',
          message: 'You must have an active subscription to manage your schedule. Please subscribe to continue.',
          requiresSubscription: true
        },
        { status: 403 }
      );
    }

    // Validate the schedule for overlaps before proceeding
    for (const daySchedule of Object.values(schedule)) {
        if (daySchedule.isEnabled && checkForOverlaps(daySchedule.timeRanges)) {
            return NextResponse.json({ error: 'Invalid schedule: overlapping or invalid time intervals detected.' }, { status: 400 });
        }
    }

    // Mapping from day name to day_of_week integer
    const dayMapping: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

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
    for (const [day, daySchedule] of Object.entries(schedule)) {
        if (daySchedule.isEnabled && daySchedule.timeRanges) {
            for (const timeRange of daySchedule.timeRanges) {
                scheduleToInsert.push({
                    profile_id: providerId,
                    day_of_week: dayMapping[day],
                    start_time: timeRange.start,
                    end_time: timeRange.end,
                });
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