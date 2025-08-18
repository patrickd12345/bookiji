"use client";

import { useEffect } from "react";
import PaymentFallback from "@/components/quality/PaymentFallback";

export default function PayError({
  error,
  reset,
  params,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  params: { bookingId: string };
}) {
  useEffect(() => {
    // Optional: telemetry with route context
    console.error("Payment route error", params.bookingId, error);
  }, [error, params.bookingId]);

  return (
    <PaymentFallback
      bookingId={params.bookingId}
      onRetry={() => reset()}
    />
  );
}
