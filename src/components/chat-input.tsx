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
const MAX_MESSAGE_LENGTH = 16_000;

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
        <div className="bg-surface border-border-input focus-within:border-foreground-tertiary flex items-end gap-2 rounded-xl border py-2.5 pr-2.5 pl-4 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Message..."
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={disabled}
            className="chat-input-scrollbar placeholder:text-foreground-tertiary text-foreground box-border max-h-70 min-h-0 w-full min-w-0 flex-1 resize-none self-center bg-transparent py-0.5 text-[15px] leading-relaxed focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={`mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-lg transition-all duration-150 ${
              canSend
                ? "bg-foreground text-background hover:opacity-90 active:scale-95"
                : disabled
                  ? "bg-surface-elevated text-foreground-tertiary"
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
                  d="M8 13V3M4.5 6.5 8 3l3.5 3.5"
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
