"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center px-4">
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="mb-6 text-sm text-foreground-tertiary">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-[13px] font-medium text-background transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
