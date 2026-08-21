"use client";

import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 280)}px`;
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="px-4 pt-4 pb-6 md:px-5">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="bg-surface border border-[#404046] shadow-shadow-md focus-within:border-[#555] focus-within:shadow-shadow-lg relative rounded-2xl pr-12 transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="chat-input-scrollbar max-h-[280px] w-full resize-none bg-transparent px-4 py-3 pr-12 text-[15px] leading-relaxed text-foreground placeholder:text-foreground-tertiary focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={`absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              canSend
                ? "bg-accent text-white shadow-sm hover:bg-accent-hover hover:shadow-md active:scale-95"
                : disabled
                  ? "bg-surface-elevated"
                  : "bg-surface-elevated text-foreground-tertiary"
            }`}
          >
            {disabled ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-75" />
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
