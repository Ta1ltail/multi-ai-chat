"use client";

import { useCallback, useEffect, useRef } from "react";
import { Message } from "./message";

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: MessageData[];
  isLoading?: boolean;
}

/** How close to the bottom (in px) before we consider the user "at the bottom" */
const SCROLL_THRESHOLD = 150;

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  /** Check whether the container is scrolled near the bottom */
  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  // Track whether the user has scrolled up manually
  const handleScroll = useCallback(() => {
    shouldAutoScroll.current = isNearBottom();
  }, [isNearBottom]);

  // Auto-scroll to bottom when new messages arrive, but only if user is near bottom
  useEffect(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6"
    >
      <div
        aria-live="polite"
        aria-label="Chat messages"
        className="mx-auto flex max-w-3xl flex-col gap-4"
      >
        {messages.map((msg) => (
          <Message key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isLoading && <Message role="assistant" content="" loading />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
