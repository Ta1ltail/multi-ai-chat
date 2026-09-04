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

  const handleCopyMessage = useCallback(async () => {
    const ok = await copyText(content);
    if (!ok) return;
    setCopied(true);
    const t = setTimeout(() => setCopied(false), COPY_RESET_MS);
    timersRef.current.add(t);
  }, [content, copyText]);

  // Code block copy via event delegation (dangerouslySetInnerHTML)
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".copy-code-btn");
      if (!btn || !container?.contains(btn)) return;

      const codeEl = btn.closest(".code-block-wrapper")?.querySelector("code");
      if (!codeEl) return;

      copyText(codeEl.textContent ?? "").then((ok) => {
        if (!ok) return;
        const copyIcon = btn.querySelector(".copy-icon");
        const checkIcon = btn.querySelector(".check-icon");
        copyIcon?.classList.add("hidden");
        checkIcon?.classList.remove("hidden");
        const t = setTimeout(() => {
          copyIcon?.classList.remove("hidden");
          checkIcon?.classList.add("hidden");
        }, COPY_RESET_MS);
        timersRef.current.add(t);
      });
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [content, copyText]);

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

  const showMessageCopy = Boolean(content);

  const copyButton = showMessageCopy ? (
    <button
      onClick={handleCopyMessage}
      aria-label={copied ? "Copied!" : "Copy message"}
      className="focus-ring text-foreground-tertiary hover:text-foreground inline-flex h-6 w-6 items-center justify-center rounded-md opacity-70 transition-all duration-100 hover:opacity-100 hover:bg-hover"
      title={copied ? "Copied!" : "Copy message"}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  ) : null;

  if (isUser) {
    return (
      <div className="message-animate-in flex min-w-0 flex-col items-end">
        <div className="bg-user-bubble text-user-bubble-text max-w-[85%] min-w-0 rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed md:max-w-[75%] md:px-5 md:py-3">
          <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
        </div>
        {copyButton && <div className="mt-1.5">{copyButton}</div>}
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
      {copyButton && <div className="mt-2">{copyButton}</div>}
    </div>
  );
});
