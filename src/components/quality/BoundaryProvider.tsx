"use client";
import { ErrorBoundary } from "./ErrorBoundary";

export default function BoundaryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary onReset={() => location.reload()}>
      {children}
    </ErrorBoundary>
  );
}
