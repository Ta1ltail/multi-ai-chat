"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

const COPY_RESET_MS = 2000;

export function Message({ role, content, loading }: MessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers / non-secure contexts
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
    setTimeout(() => setCopied(false), COPY_RESET_MS);
  }, [content, copyText]);

  // Code blocks are injected via dangerouslySetInnerHTML, so their copy
  // buttons can't take a React onClick directly — we listen on the stable
  // wrapper instead and match clicks against .copy-code-btn. This also
  // avoids ever needing to embed JS inside an HTML attribute string.
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
        const label = btn.querySelector(".copy-label");
        copyIcon?.classList.add("hidden");
        checkIcon?.classList.remove("hidden");
        if (label) label.textContent = "Copied!";
        setTimeout(() => {
          copyIcon?.classList.remove("hidden");
          checkIcon?.classList.add("hidden");
          if (label) label.textContent = "Copy";
        }, COPY_RESET_MS);
      });
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [content, copyText]);

  if (loading) {
    return (
      <div className="message-animate-in flex justify-start">
        <div className="flex items-center gap-1.5 py-2">
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
          <span className="bg-foreground-tertiary inline-block h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  // Always visible, icon-only, sits below the message in normal document
  // flow — no hover-triggered show/hide, so nothing reflows when it
  // appears. Alignment (left for assistant, right for user) comes from the
  // flex-col items-start/items-end wrapper below.
  //
  // Assistant replies that contain a code block already get a copy button
  // directly under each block (see lib/markdown.ts). Showing the
  // whole-message button too, right underneath that, reads as a duplicate
  // — especially when the code block is the last thing in the reply — so
  // it's suppressed whenever the content has at least one fenced block.
  const hasCodeBlock = !isUser && /```[\s\S]*?```/.test(content);
  const showMessageCopy = Boolean(content) && !hasCodeBlock;

  const copyButton = showMessageCopy ? (
    <button
      onClick={handleCopyMessage}
      className="focus-ring text-foreground-tertiary hover:text-foreground hover:bg-hover flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      title={copied ? "Copied!" : "Copy message"}
    >
      {copied ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
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
    </button>
  ) : null;

  if (isUser) {
    return (
      <div className="message-animate-in flex min-w-0 flex-col items-end">
        <div className="bg-user-bubble text-user-bubble-text max-w-[80%] min-w-0 rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm md:max-w-[65%]">
          <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
        </div>
        {copyButton && <div className="mt-1">{copyButton}</div>}
      </div>
    );
  }

  return (
    <div className="message-animate-in flex flex-col items-start">
      <div
        ref={contentRef}
        className="text-foreground w-full min-w-0 text-[15px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
      {copyButton && <div className="mt-1">{copyButton}</div>}
    </div>
  );
}
