"use client";

import { useCallback, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import { ModelSelector } from "@/components/model-selector";
import { Toast } from "@/components/toast";
import { AUTO_MODEL_ID } from "@/lib/ai";
import { useTheme } from "@/lib/use-theme";
import { useChat } from "@/lib/use-chat";
import type { ToastState } from "@/types";

const MODEL_STORAGE_KEY = "selectedModel";

function getStoredModel(): string {
  if (typeof window === "undefined") return AUTO_MODEL_ID;
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // ignore
  }
  return AUTO_MODEL_ID;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const {
    conversations,
    activeId,
    messages,
    isLoading,
    loaded,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleSend,
  } = useChat();

  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [selectedModel, setSelectedModel] = useState(getStoredModel);
  const toastCounterRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastState["type"] = "error") => {
    const id = ++toastCounterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    } catch {
      // ignore
    }
  }, []);

  const handleSendWithModel = useCallback(
    async (content: string) => {
      try {
        await handleSend(content, selectedModel);
      } catch {
        addToast("Failed to get response");
      }
    },
    [handleSend, selectedModel, addToast],
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
                onSelectModel={handleSelectModel}
                disabled={isLoading}
              />
            </div>
            <ChatInput onSend={handleSendWithModel} disabled={isLoading} />
          </div>
        </div>
      ) : (
        <>
          <MessageList key={activeId ?? "empty"} messages={messages} isLoading={isLoading} />
          <div className="shrink-0 px-4 pb-1 pt-2 md:px-5">
            <div className="mx-auto max-w-3xl">
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                disabled={isLoading}
              />
            </div>
          </div>
          <ChatInput onSend={handleSendWithModel} disabled={isLoading} />
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
