'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useOptimisticActionWithTelemetry, useDebouncedClickWithTelemetry } from '@/hooks';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';

interface BookingData {
  serviceId: string;
  date: string;
  time: string;
}

interface BookingResult {
  success: boolean;
  bookingId?: string;
}

interface ResilientBookingButtonProps {
  onBook: (data: BookingData) => Promise<BookingResult>;
  serviceId: string;
  date: string;
  time: string;
}

export function ResilientBookingButton({ onBook, serviceId, date, time }: ResilientBookingButtonProps) {
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // 1. OPTIMISTIC UI + GRACEFUL ROLLBACK with TELEMETRY
  const { execute, isLoading, error } = useOptimisticActionWithTelemetry({
    action: async () => {
      const result = await onBook({ serviceId, date, time });
      if (!result.success) {
        throw new Error('Booking failed');
      }
      return result;
    },
    onSuccess: (result: BookingResult) => {
      setBookingId(result.bookingId || null);
      setIsOptimistic(false);
    },
    onError: (error: Error) => {
      // Graceful rollback - reset optimistic state
      setIsOptimistic(false);
      setBookingId(null);
      console.error('Booking failed, rolling back:', error);
    },
    component: 'ResilientBookingButton' // Required for telemetry
  });

  // 2. DEBOUNCED CLICK (prevents double-click chaos) with TELEMETRY
  const debouncedBook = useDebouncedClickWithTelemetry(async () => {
    setIsOptimistic(true);
    setBookingId(null);
    await execute();
  }, { 
    delay: 300,
    component: 'ResilientBookingButton' // Required for telemetry
  });

  // 3. LOADING SKELETONS (instead of dead space)
  if (isLoading || isOptimistic) {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full">
          <Calendar className="h-4 w-4 mr-2 animate-pulse" />
          <LoadingSkeleton width={80} height={16} />
        </Button>
        <div className="text-center">
          <LoadingSkeleton width={120} height={14} />
        </div>
      </div>
    );
  }

  // 4. FAST-FAIL ERROR DISPLAY (clear error + retry within 6-8s)
  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Booking failed</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => debouncedBook()} variant="outline" size="sm">
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
            Reload
          </Button>
        </div>
      </div>
    );
  }

  // 5. SUCCESS STATE (optimistic confirmation)
  if (bookingId) {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full bg-green-600">
          <CheckCircle className="h-4 w-4 mr-2" />
          Booked Successfully!
        </Button>
        <p className="text-center text-sm text-green-600">
          Booking ID: {bookingId}
        </p>
      </div>
    );
  }

  // Default state
  return (
    <Button onClick={() => debouncedBook()} className="w-full">
      <Calendar className="h-4 w-4 mr-2" />
      Book Now
    </Button>
  );
}
