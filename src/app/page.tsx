"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageList, type MessageData } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";

const mockConversations = [
  { id: "1", title: "Welcome chat", active: true },
  { id: "2", title: "Comparing LLM providers" },
  { id: "3", title: "Free tier options" },
];

const mockMessages: MessageData[] = [
  {
    id: "1",
    role: "user",
    content: "What are the best free AI providers right now?",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Here are some of the best free AI providers available:\n\n1. Google Gemini — Generous free tier with access to Gemini models\n2. Groq — Fast inference with free tier for several models\n3. OpenRouter — Aggregator with some free models available\n\nEach has different rate limits and model selections. Would you like me to go deeper into any of these?",
  },
  {
    id: "3",
    role: "user",
    content: "Tell me more about Groq's free tier.",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Groq offers free API access with very fast inference speeds. Their free tier includes:\n\n- Access to Llama 3 and Mixtral models\n- Fast response times (often under 1 second)\n- Rate limits that are generous for personal use\n- Simple API that's compatible with OpenAI's format\n\nThe main limitation is request volume, but for a chat application it's usually sufficient.",
  },
];

export default function Home() {
  const [conversations] = useState(mockConversations);
  const [messages, setMessages] = useState<MessageData[]>(mockMessages);
  const [isLoading, setIsLoading] = useState(false);

  function handleSend(message: string) {
    const userMsg: MessageData = {
      id: Date.now().toString(),
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsLoading(true);
    setTimeout(() => {
      const assistantMsg: MessageData = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `This is a mock response to: "${message}"\n\nAI provider integration will be added in a later phase. For now, this demonstrates the chat UI.`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
    }, 1500);
  }

  return (
    <AppShell
      conversations={conversations}
      onNewChat={() => {
        setMessages([]);
      }}
      onSelectConversation={(id) => {
        console.log("Selected conversation:", id);
      }}
    >
      {messages.length === 0 ? (
        /* Empty state — centered greeting + input */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <h2 className="mb-2 text-lg font-medium text-foreground">
            Hi, how can I help you today?
          </h2>
          <p className="mb-8 text-sm text-foreground-secondary">Ask me anything.</p>
          <div className="w-full max-w-2xl">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      ) : (
        <>
          <MessageList messages={messages} isLoading={isLoading} />
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </>
      )}
    </AppShell>
  );
}
