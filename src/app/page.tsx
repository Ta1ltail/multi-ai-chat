"use client";

import { useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageList, type MessageData } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import { ModelSelector } from "@/components/model-selector";
import { Toast } from "@/components/toast";
import { getDefaultModel, getModelById } from "@/lib/ai";
import { useTheme } from "@/lib/use-theme";

interface Conversation {
  id: string;
  title: string;
  messages: MessageData[];
  createdAt: number;
}

interface ToastState {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

let toastCounter = 0;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40).trimEnd() + "...";
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

  const addToast = useCallback((message: string, type: ToastState["type"] = "error") => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeIdRef.current === id) {
        setActiveId(null);
      }
    },
    [],
  );

  const handleSend = useCallback(
    async (content: string) => {
      // Create a new conversation if none is active
      let convId = activeIdRef.current;
      if (!convId) {
        convId = generateId();
        const newConv: Conversation = {
          id: convId,
          title: generateTitle(content),
          messages: [],
          createdAt: Date.now(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveId(convId);
      }

      const userMsg: MessageData = {
        id: generateId(),
        role: "user",
        content,
      };

      const assistantId = generateId();
      const assistantMsg: MessageData = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      // Capture conversation history BEFORE updating state to avoid stale closure.
      let historyMessages: MessageData[] = [];
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === convId);
        historyMessages = conv?.messages ?? [];
        const currentMessages = historyMessages;
        const updatedMessages = [...currentMessages, userMsg, assistantMsg];

        const title =
          conv && conv.messages.length === 0 ? generateTitle(content) : conv?.title ?? "";

        return prev.map((c) =>
          c.id === convId ? { ...c, title, messages: updatedMessages } : c,
        );
      });

      setIsLoading(true);

      try {
        const apiMessages = [...historyMessages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Resolve provider from model config
        const modelId = selectedModelRef.current;
        const modelConfig = getModelById(modelId);
        const providerId = modelConfig?.provider ?? "groq";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, provider: providerId, model: modelId }),
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
                  const currentFullText = fullText;
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === convId
                        ? {
                            ...c,
                            messages: c.messages.map((m) =>
                              m.id === assistantId ? { ...m, content: currentFullText } : m,
                            ),
                          }
                        : c,
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
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: `Error: ${errorMsg}` } : m,
                  ),
                }
              : c,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [addToast],
  );

  return (
    <AppShell
      conversations={conversations.map((c) => ({
        id: c.id,
        title: c.title,
        active: c.id === activeId,
      }))}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {messages.length === 0 ? (
        /* Empty state — centered greeting + input */
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <h2 className="mb-1.5 text-xl font-semibold tracking-tight text-foreground">
            How can I help you today?
          </h2>
          <p className="mb-8 text-sm text-foreground-tertiary">Ask me anything.</p>
          <div className="w-full max-w-2xl">
            <div className="mb-2 flex justify-center">
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                disabled={isLoading}
              />
            </div>
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      ) : (
        <>
          <MessageList messages={messages} isLoading={isLoading} />
          <div className="shrink-0 px-4 pb-1 pt-2 md:px-5">
            <div className="mx-auto max-w-3xl">
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                disabled={isLoading}
              />
            </div>
          </div>
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
