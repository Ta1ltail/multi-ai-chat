"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";
import { sanitizeHTML } from "@/lib/sanitize";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const COPY_RESET_MS = 2000;

export const Message = memo(function Message({ role, content, loading }: MessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear any pending copy-indicator timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    }
  }, []);

  const resetAfter = useCallback((fn: () => void) => {
    const t = setTimeout(fn, COPY_RESET_MS);
    timersRef.current.add(t);
  }, []);

  const handleCopyMessage = useCallback(async () => {
    const ok = await copyText(content);
    if (!ok) return;
    setCopied(true);
    resetAfter(() => setCopied(false));
  }, [content, copyText, resetAfter]);

  // Code block copy via event delegation (dangerouslySetInnerHTML).
  // Each fence renders exactly one `.copy-code-btn` inside its header.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const root = container;

    function handleClick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".copy-code-btn");
      if (!btn || !root.contains(btn)) return;

      const block = btn.closest<HTMLElement>(".code-block");
      const codeEl = block?.querySelector("code");
      if (!codeEl) return;

      copyText(codeEl.textContent ?? "").then((ok) => {
        if (!ok) return;
        const label = btn.querySelector<HTMLElement>(".copy-label");
        const copyIcon = btn.querySelector<HTMLElement>(".copy-icon");
        const checkIcon = btn.querySelector<HTMLElement>(".check-icon");
        if (label) label.textContent = "Copied!";
        copyIcon?.classList.add("hidden");
        checkIcon?.classList.remove("hidden");
        resetAfter(() => {
          if (label) label.textContent = "Copy";
          copyIcon?.classList.remove("hidden");
          checkIcon?.classList.add("hidden");
        });
      });
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [content, copyText, resetAfter]);

  if (loading) {
    return (
      <div className="message-animate-in flex justify-start">
        <div className="flex items-center gap-1.5 py-2.5">
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="message-animate-in flex min-w-0 flex-col items-end">
        <div className="bg-user-bubble text-user-bubble-text max-w-[90%] min-w-0 rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap md:max-w-[78%] md:px-5 md:py-3">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="message-animate-in flex flex-col items-start">
      <div
        ref={contentRef}
        className="chat-prose text-foreground w-full min-w-0"
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(renderMarkdown(content)) }}
      />
      {/* One copy button for the entire response, at the very end */}
      <button
        type="button"
        onClick={handleCopyMessage}
        aria-label={copied ? "Copied response" : "Copy response"}
        title={copied ? "Copied!" : "Copy response"}
        className="focus-ring text-foreground-tertiary hover:text-foreground hover:border-border-separator hover:bg-hover mt-2.5 inline-flex h-7 items-center gap-1.5 rounded-lg border border-transparent px-2 text-xs font-medium transition-colors duration-100"
      >
        {copied ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
        {copied ? "Copied!" : "Copy response"}
      </button>
    </div>
  );
});
