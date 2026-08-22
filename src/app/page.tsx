"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageList, type MessageData } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import { Toast } from "@/components/toast";

const mockConversations = [
  { id: "1", title: "Welcome chat", active: true },
  { id: "2", title: "Comparing LLM providers" },
  { id: "3", title: "Free tier options" },
];

const initialMessages: MessageData[] = [];

interface ToastState {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

export default function Home() {
  const [conversations] = useState(mockConversations);
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const addToast = useCallback((message: string, type: ToastState["type"] = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      const userMsg: MessageData = {
        id: Date.now().toString(),
        role: "user",
        content,
      };

      const assistantId = (Date.now() + 1).toString();
      const assistantMsg: MessageData = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: (m.role === "assistant" ? "model" : m.role) as "user" | "model",
          parts: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data) as { text?: string; error?: string };
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.text) {
                  fullText += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: fullText } : m,
                    ),
                  );
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to get response";
        addToast(errorMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${errorMsg}` } : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, addToast],
  );

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

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </AppShell>
  );
}
