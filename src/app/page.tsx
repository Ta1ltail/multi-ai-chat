"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MessageList } from "@/components/message-list";
import { ChatInput } from "@/components/chat-input";
import { Toast } from "@/components/toast";
import { BrandMark } from "@/components/brand-mark";
import { AUTO_MODEL_ID } from "@/lib/ai/models";
import { useTheme } from "@/lib/use-theme";
import { useChat } from "@/lib/use-chat";
import type { ToastState } from "@/types";

const MODEL_STORAGE_KEY = "selectedModel";

interface Suggestion {
  icon: string;
  title: string;
  description: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: "✨",
    title: "What can you do?",
    description: "Intro to your providers and models",
    prompt:
      "What can you do? Briefly explain which AI providers and models you're connected to and what makes them different.",
  },
  {
    icon: "💻",
    title: "Help me write code",
    description: "A function, explained clearly",
    prompt:
      "Write a small TypeScript function that debounces another function, then explain how it works step by step.",
  },
  {
    icon: "✍️",
    title: "Draft a message",
    description: "A short, professional email",
    prompt: "Draft a short, professional email asking a colleague for an update on a shared project.",
  },
  {
    icon: "🧠",
    title: "Explain a topic",
    description: "Made simple for a beginner",
    prompt: "Explain how large language models work in simple terms, as if I'm new to the idea.",
  },
];

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const {
    conversations, activeId, messages, isLoading, loaded,
    handleNewChat, handleSelectConversation, handleDeleteConversation, handleSend, handleStop,
  } = useChat();

  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [selectedModel, setSelectedModel] = useState(AUTO_MODEL_ID);
  const toastCounterRef = useRef(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_STORAGE_KEY);
      if (stored) setSelectedModel(stored);
    } catch { /* ignore */ }
  }, []);

  const addToast = useCallback((message: string, type: ToastState["type"] = "error") => {
    const id = ++toastCounterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    try { localStorage.setItem(MODEL_STORAGE_KEY, modelId); } catch { /* ignore */ }
  }, []);

  const handleSendWithModel = useCallback(async (content: string) => {
    try {
      await handleSend(content, selectedModel);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Failed to get response");
    }
  }, [handleSend, selectedModel, addToast]);

  return (
    <AppShell
      conversations={conversations.map((c) => ({ id: c.id, title: c.title, active: c.id === activeId }))}
      onNewChat={handleNewChat} onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation} theme={theme} onToggleTheme={toggleTheme}
      selectedModel={selectedModel} onSelectModel={handleSelectModel} modelDisabled={isLoading}
    >
      {!loaded ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-foreground-tertiary">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-75" />
            </svg>
            Loading...
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6">
          <div className="w-full max-w-2xl text-center">
            <div className="mb-6 flex justify-center">
              <BrandMark className="h-12 w-12 rounded-2xl shadow-md" />
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-3xl">
              How can I help you today?
            </h1>
            <p className="mt-2 text-sm text-foreground-tertiary">
              Pick a model in the top bar, or keep Auto for the best available.
            </p>

            <div className="mt-8 grid gap-2.5 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.title}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendWithModel(suggestion.prompt)}
                  className="focus-ring group flex items-start gap-3 rounded-2xl border border-border-separator bg-surface p-3.5 text-left transition-all duration-150 hover:border-border-input hover:shadow-sm active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-light text-base"
                  >
                    {suggestion.icon}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] font-medium text-foreground group-hover:text-foreground">
                      {suggestion.title}
                    </span>
                    <span className="truncate text-xs text-foreground-tertiary">
                      {suggestion.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MessageList key={activeId ?? "empty"} messages={messages} isLoading={isLoading} />
      )}

      <ChatInput onSend={handleSendWithModel} onStop={handleStop} disabled={isLoading} />

      {toasts.length > 0 && (
        <div className="fixed right-3 bottom-3 z-50 flex flex-col gap-2 md:right-4 md:bottom-4">
          {toasts.map((toast) => (
            <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}