"use client";
import FallbackView from "./FallbackView";
import { useRouter } from "next/navigation";

type Props = {
  bookingId?: string;
  onRetry?: () => void;
};

export default function PaymentFallback({ bookingId, onRetry }: Props) {
  const router = useRouter();

  return (
    <FallbackView
      title="Payment temporarily unavailable"
      message="Our payment service is having trouble. You can retry, pick another payment method, or return to your booking."
      onRetry={onRetry}
      actions={
        <>
          {bookingId && (
            <button
              type="button"
              onClick={() => router.push(`/confirm/${bookingId}`)}
              className="rounded-xl px-4 py-2 border bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              data-testid="fallback-to-confirm"
            >
              Back to Booking
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/pay/choose")}
            className="rounded-xl px-4 py-2 border bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            data-testid="fallback-choose-method"
          >
            Choose Another Method
          </button>
        </>
      }
    />
  );
}
