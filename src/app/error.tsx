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
        <h2 className="text-foreground mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="text-foreground-tertiary mb-6 text-sm">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="focus-ring bg-foreground text-background inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
