"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_MESSAGE_LENGTH = 16_000;

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  /** Reports the composer's total height so the chat can reserve space under it. */
  onHeightChange?: (height: number) => void;
}

export function ChatInput({ onSend, onStop, disabled, onHeightChange }: ChatInputProps) {
  const [value, setValue] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number>(0);

  // The textarea owns its own space: it grows up to a viewport-aware cap and
  // then scrolls internally, so multi-line input never squeezes the chat.
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const max = Math.min(
      200,
      typeof window === "undefined" ? 200 : Math.max(88, Math.floor(window.innerHeight * 0.32)),
    );
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  // Cancel any pending rAF resize on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Report our real height so the parent can pad the scroll viewport beneath
  // us. The composer is absolutely positioned, so it never reflows the page.
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = Math.round(entries[0].contentRect.height);
      setHeight((prev) => (Math.abs(prev - h) < 1 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    onHeightChange?.(height);
  }, [height, onHeightChange]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(resizeTextarea);
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
      role="region"
      aria-label="Message composer"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl px-3 pb-2 md:px-4 md:pb-3">
        <form onSubmit={handleSubmit}>
          <div className="bg-surface border-border-input focus-within:ring-accent/20 focus-within:border-accent/50 flex flex-col overflow-hidden rounded-[1.5rem] border shadow-md transition-shadow duration-150 focus-within:shadow-lg focus-within:ring-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Ask anything..."
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              aria-label="Message"
              className="chat-input-scrollbar placeholder:text-foreground-tertiary text-foreground min-h-0 w-full resize-none overflow-y-auto overscroll-contain bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed focus:outline-none md:px-5"
            />

            <div className="flex items-center gap-1.5 px-2.5 pt-0.5 pb-2.5 md:px-3.5">
              <p className="text-foreground-tertiary hidden min-w-0 flex-1 truncate pl-1.5 text-[11px] select-none sm:block">
                Enter to send · Shift + Enter for a new line
              </p>

              {disabled && onStop ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generating"
                  className="focus-ring border-border-separator bg-surface-elevated text-foreground hover:bg-hover flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-150 active:scale-95"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send message"
                  className={`focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:pointer-events-none ${
                    canSend
                      ? "bg-foreground text-background shadow-sm hover:opacity-90"
                      : "bg-surface-elevated text-foreground-tertiary"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 13V3M4.5 6.5 8 3l3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>

        <p className="text-foreground-tertiary mt-1.5 text-center text-[11px] leading-relaxed select-none">
          Multi AI Chat can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
}
