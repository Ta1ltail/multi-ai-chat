"use client";

import { useEffect, useRef } from "react";
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

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((msg) => (
          <Message key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isLoading && <Message role="assistant" content="" loading />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
