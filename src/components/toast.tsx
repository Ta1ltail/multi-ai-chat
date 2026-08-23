"use client";

import { useEffect, useRef, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  onClose: () => void;
}

export function Toast({ message, type = "error", onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onCloseRef.current(), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const bgColor = {
    error: "bg-error-bg border-error/40 text-error",
    success: "bg-accent-light border-accent/30 text-accent",
    info: "bg-surface-elevated border-border-separator text-foreground",
  }[type];

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${bgColor} ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm leading-snug">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-foreground-tertiary hover:text-foreground shrink-0 transition-colors duration-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
