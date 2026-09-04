"use client";

import { useCallback, useEffect, useRef } from "react";
import { Message } from "./message";
import type { MessageData } from "@/types";

interface MessageListProps {
  messages: MessageData[];
  isLoading?: boolean;
  /** Extra bottom padding (px) reserved for the overlay composer. */
  bottomPad?: number;
}

const SCROLL_THRESHOLD = 150;

export function MessageList({ messages, isLoading, bottomPad = 0 }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
  }, []);

  const handleScroll = useCallback(() => {
    shouldAutoScroll.current = isNearBottom();
  }, [isNearBottom]);

  useEffect(() => {
    if (shouldAutoScroll.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const hasScrolledInitial = useRef(false);
  useEffect(() => {
    if (!hasScrolledInitial.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      hasScrolledInitial.current = true;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="custom-scrollbar flex-1 overflow-y-auto px-3 pt-4 md:px-4 md:pt-6"
    >
      <div
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="mx-auto flex w-full max-w-3xl flex-col gap-5 md:gap-6"
        style={{ paddingBottom: `${bottomPad + 16}px` }}
      >
        {messages.map((msg) => (
          <Message key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isLoading && (
          <div role="status" aria-label="Assistant is responding">
            <Message role="assistant" content="" loading />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
