"use client";

import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

const MAX_HEIGHT = 280;
const MAX_MESSAGE_LENGTH = 16_000;

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number>(0);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => { resizeTextarea(); }, [value, resizeTextarea]);

  // Cancel any pending rAF resize on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  }

  function handleInput() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(resizeTextarea);
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="shrink-0 px-3 pt-1 pb-2 md:px-4 md:pt-2 md:pb-4">
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
        <div className="bg-surface border-border-input shadow-sm focus-within:shadow-md focus-within:ring-accent/20 flex flex-col rounded-[1.6rem] border transition-shadow duration-150 focus-within:border-accent/50 focus-within:ring-2">
          <textarea
            ref={textareaRef} value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown} onInput={handleInput} placeholder="Ask anything..."
            rows={1} maxLength={MAX_MESSAGE_LENGTH}
            className="chat-input-scrollbar placeholder:text-foreground-tertiary text-foreground box-border max-h-70 min-h-0 w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed focus:outline-none md:px-5"
          />

          <div className="flex items-center gap-1.5 px-2.5 pb-2.5 md:px-3.5">
            <p className="hidden min-w-0 flex-1 select-none truncate pl-1.5 text-[11px] text-foreground-tertiary sm:block">
              Enter to send · Shift + Enter for new line
            </p>

            {disabled && onStop ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-separator bg-surface-elevated text-foreground transition-all duration-150 hover:bg-hover hover:text-foreground active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
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
                  <path d="M8 13V3M4.5 6.5 8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 hidden text-center text-[11px] leading-relaxed text-foreground-tertiary sm:block">
          Multi AI Chat can make mistakes. Check important information.
        </p>
      </form>
    </div>
  );
}