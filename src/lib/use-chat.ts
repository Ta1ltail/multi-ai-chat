"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, MessageData } from "@/types";
import { getModelById } from "@/lib/ai";
import { readSSEStream } from "@/lib/sse";
import { loadConversations, saveConversations } from "@/lib/conversations";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 40).trimEnd() + "...";
}

export interface UseChatReturn {
  conversations: Conversation[];
  activeId: string | null;
  messages: MessageData[];
  isLoading: boolean;
  loaded: boolean;
  handleNewChat: () => void;
  handleSelectConversation: (id: string) => void;
  handleDeleteConversation: (id: string) => void;
  handleSend: (content: string, modelId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const abortRef = useRef<AbortController | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const persisted = loadConversations();
    if (persisted.length > 0) {
      setConversations(persisted);
    }
    setLoaded(true);
  }, []);

  // Debounced save to localStorage with max-wait (throttle)
  // Tokens arrive faster than 500ms apart during streaming, so a pure
  // trailing debounce would never fire mid-stream. We force a save after
  // 3 seconds regardless, and flush immediately on pagehide/visibilitychange.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const lastSavedAtRef = useRef(0);
  const conversationsRefForSave = useRef(conversations);
  conversationsRefForSave.current = conversations;

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    saveConversations(conversationsRefForSave.current);
    lastSavedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const now = Date.now();
    const elapsed = now - lastSavedAtRef.current;
    const MAX_WAIT_MS = 3000;
    const DEBOUNCE_MS = 500;

    if (elapsed >= MAX_WAIT_MS) {
      // Max-wait exceeded: save immediately (throttle behavior)
      flushSave();
    } else {
      // Still within debounce window: schedule, but cap at max-wait boundary
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const remaining = MAX_WAIT_MS - elapsed;
      saveTimerRef.current = setTimeout(flushSave, Math.min(DEBOUNCE_MS, remaining));
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [conversations, loaded, flushSave]);

  // Flush pending save on page hide / tab close / navigation
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushSave();
    }
    function handlePageHide() {
      flushSave();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushSave]);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

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
    async (content: string, modelId: string) => {
      // Abort any in-flight request
      abortRef.current?.abort();

      // Determine conversation ID — create new if needed
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

      // Read conversation history from ref — pure read, no side-effect in updater
      const currentConv = conversationsRef.current.find((c) => c.id === convId);
      const historyMessages = currentConv?.messages ?? [];

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

      // Append user + empty assistant message
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === convId);
        const title =
          conv && conv.messages.length === 0 ? generateTitle(content) : conv?.title ?? "";
        return prev.map((c) =>
          c.id === convId
            ? { ...c, title, messages: [...c.messages, userMsg, assistantMsg] }
            : c,
        );
      });

      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const apiMessages = [...historyMessages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const modelConfig = getModelById(modelId);
        const providerId = modelConfig?.provider ?? "groq";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, provider: providerId, model: modelId }),
          signal: controller.signal,
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
        if (error instanceof DOMException && error.name === "AbortError") return;
        const errorMsg = error instanceof Error ? error.message : "Failed to get response";
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
        throw error; // Re-throw so caller can show toast
      } finally {
        // Only reset loading if this request is still the active one.
        // If send #2 aborted send #1, send #1's finally must not clobber
        // send #2's isLoading(true).
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsLoading(false);
        }
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
    [],
  );

  return {
    conversations,
    activeId,
    messages,
    isLoading,
    loaded,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleSend,
  };
}
