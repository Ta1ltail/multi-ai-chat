"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageList, type MessageData } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import { ModelSelector } from "@/components/model-selector";
import { Toast } from "@/components/toast";
import { getDefaultModel, getModelById } from "@/lib/ai";
import { useTheme } from "@/lib/use-theme";
import { readSSEStream } from "@/lib/sse";
import { loadConversations, saveConversations, type Conversation } from "@/lib/conversations";

interface ToastState {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

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
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);
  const toastCounterRef = useRef(0);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  // Load from localStorage on mount
  useEffect(() => {
    const persisted = loadConversations();
    if (persisted.length > 0) {
      setConversations(persisted);
    }
    setLoaded(true);
  }, []);

  // Debounced save to localStorage
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveConversations(conversations);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [conversations, loaded]);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

  const addToast = useCallback((message: string, type: ToastState["type"] = "error") => {
    const id = ++toastCounterRef.current;
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

        let fullText = "";
        await readSSEStream(
          res,
          (event) => {
            if (event.text) {
              fullText += event.text;
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
          },
          () => {},
        );
      } catch (error) {
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
        // Clean up empty assistant message if stream returned no content
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.filter(
                    (m) => !(m.id === assistantId && m.content === ""),
                  ),
                }
              : c,
          ),
        );
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
      {!loaded ? (
        /* Loading skeleton while hydrating from localStorage */
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-foreground-tertiary">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-75" />
            </svg>
            Loading...
          </div>
        </div>
      ) : messages.length === 0 ? (
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
          <MessageList key={activeId ?? "empty"} messages={messages} isLoading={isLoading} />
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
