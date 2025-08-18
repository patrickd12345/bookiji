"use client";

import { useEffect } from "react";
import FallbackView from "@/components/quality/FallbackView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void; // Next.js provides this to re-render the route segment
}) {
  useEffect(() => {
    // Optional: log to your telemetry
    console.error("Global error", error);
  }, [error]);

  return (
    <html>
      <body>
        <FallbackView
          title="Unexpected error"
          message="The page failed to render. Try again or return home."
          onRetry={() => reset()}
        />
      </body>
    </html>
  );
}
