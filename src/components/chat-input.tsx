"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const MAX_HEIGHT = 280;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number>(0);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
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
    <div className="shrink-0 px-4 py-4 md:px-5">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="bg-surface border-border-input shadow-shadow-md focus-within:border-accent focus-within:shadow-shadow-lg flex items-end gap-2 rounded-2xl border py-2 pl-4 pr-3 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="chat-input-scrollbar placeholder:text-foreground-tertiary text-foreground box-border max-h-70 min-h-0 w-full min-w-0 flex-1 resize-none self-center bg-transparent py-1 text-[15px] leading-relaxed focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={`mb-1 flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-lg transition-all ${
              canSend
                ? "bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow-md active:scale-95"
                : disabled
                  ? "bg-surface-elevated"
                  : "bg-surface-elevated text-foreground-tertiary"
            }`}
          >
            {disabled ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="opacity-25"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
