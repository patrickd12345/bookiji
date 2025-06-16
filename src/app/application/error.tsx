"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
      <p className="mb-4 text-gray-700">{error.message || "An unexpected error occurred. Please try again."}</p>
      <button
        className="px-6 py-2 bg-[#A259FF] text-white rounded-full font-semibold hover:bg-[#7C3AED] transition"
        onClick={() => reset()}
      >
        Try Again
      </button>
    </div>
  );
} 