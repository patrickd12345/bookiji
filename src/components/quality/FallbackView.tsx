"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actions?: React.ReactNode;
};

export default function FallbackView({
  title = "Something went wrong",
  message = "We hit a snag. You can try again or go back.",
  onRetry,
  actions,
}: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // We can't reliably detect history length in Next, but we can offer a back anyway
    setCanGoBack(true);
  }, []);

  return (
    <section
      role="alert"
      aria-live="assertive"
      className="mx-auto mt-16 max-w-lg rounded-2xl border p-6 shadow bg-white dark:bg-gray-900"
    >
      <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h1>
      <p className="text-sm opacity-80 mb-6 text-gray-700 dark:text-gray-300">{message}</p>

      <div className="flex gap-3 flex-wrap">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl px-4 py-2 border shadow bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            data-testid="fallback-retry"
          >
            Retry
          </button>
        )}

        {canGoBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl px-4 py-2 border bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            data-testid="fallback-back"
          >
            Back
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl px-4 py-2 border bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          data-testid="fallback-home"
        >
          Home
        </button>

        {actions}
      </div>
    </section>
  );
}
