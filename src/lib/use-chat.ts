"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, MessageData } from "@/types";
import { getModelById } from "@/lib/ai/models";
import { readSSEStream } from "@/lib/sse";
import { loadConversations, saveConversations } from "@/lib/conversations";

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
  handleStop: () => void;
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

  useEffect(() => {
    const persisted = loadConversations();
    if (persisted.length > 0) setConversations(persisted);
    setLoaded(true);
  }, []);

  // Throttled save: flush on pagehide/visibilitychange, max 3s deferred
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const lastSavedAtRef = useRef(0);
  const conversationsRefForSave = useRef(conversations);
  conversationsRefForSave.current = conversations;

  const flushSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const result = saveConversations(conversationsRefForSave.current);
    lastSavedAtRef.current = Date.now();
    if (!result.ok && result.saved) setConversations(result.saved);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const elapsed = Date.now() - lastSavedAtRef.current;
    const MAX_WAIT_MS = 3000;
    const DEBOUNCE_MS = 500;

    if (elapsed >= MAX_WAIT_MS) {
      flushSave();
    } else {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const remaining = MAX_WAIT_MS - elapsed;
      saveTimerRef.current = setTimeout(flushSave, Math.min(DEBOUNCE_MS, remaining));
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [conversations, loaded, flushSave]);

  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === "hidden") flushSave(); };
    const onPageHide = () => flushSave();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flushSave]);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
  }, []);

  const handleSelectConversation = useCallback((id: string) => { setActiveId(id); }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    if (activeIdRef.current === id) {
      abortRef.current?.abort();
      setActiveId(null);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSend = useCallback(async (content: string, modelId: string) => {
    abortRef.current?.abort();

    const convId = activeIdRef.current ?? crypto.randomUUID();
    if (!activeIdRef.current) {
      setConversations((prev) => [
        { id: convId, title: generateTitle(content), messages: [], createdAt: Date.now() },
        ...prev,
      ]);
      setActiveId(convId);
    }

    const currentConv = conversationsRef.current.find((c) => c.id === convId);
    const historyMessages = currentConv?.messages ?? [];

    const userMsg: MessageData = { id: crypto.randomUUID(), role: "user", content };
    const assistantId = crypto.randomUUID();
    const assistantMsg: MessageData = { id: assistantId, role: "assistant", content: "" };

    setConversations((prev) => {
      const conv = prev.find((c) => c.id === convId);
      const title = conv && conv.messages.length === 0 ? generateTitle(content) : conv?.title ?? "";
      return prev.map((c) =>
        c.id === convId ? { ...c, title, messages: [...c.messages, userMsg, assistantMsg] } : c,
      );
    });

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const filteredHistory = [...historyMessages, userMsg].filter((m) =>
        !(m.role === "assistant" && (m.content === "" || m.content.startsWith("Error: "))),
      );

      const modelConfig = getModelById(modelId);
      const contextLength = modelConfig?.contextLength ?? 131072;
      const maxChars = Math.floor(contextLength * 0.8 * 4);
      let totalChars = 0;
      const windowedMessages: typeof filteredHistory = [];
      for (let i = filteredHistory.length - 1; i >= 0; i--) {
        totalChars += filteredHistory[i].content.length;
        if (totalChars > maxChars) break;
        windowedMessages.unshift(filteredHistory[i]);
      }

      const apiMessages = windowedMessages.map((m) => ({ role: m.role, content: m.content }));
      const providerId = modelConfig?.provider ?? "groq";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, provider: providerId, model: modelId }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      let fullText = "";
      let pendingText = "";
      let rafId = 0;

      const flushPending = () => {
        rafId = 0;
        if (!pendingText) return;
        fullText += pendingText;
        pendingText = "";
        const snapshot = fullText;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: snapshot } : m) }
              : c,
          ),
        );
      };

      await readSSEStream(
        res,
        (event) => {
          if (event.text) {
            pendingText += event.text;
            if (rafId === 0) rafId = requestAnimationFrame(flushPending);
          }
        },
        () => { cancelAnimationFrame(rafId); flushPending(); },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const errorMsg = error instanceof Error ? error.message : "Failed to get response";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: `Error: ${errorMsg}` } : m) }
            : c,
        ),
      );
      throw error;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.filter((m) => !(m.id === assistantId && m.content === "")) }
            : c,
        ),
      );
    }
  }, []);

  const handleStop = useCallback(() => { abortRef.current?.abort(); }, []);

  return {
    conversations, activeId, messages, isLoading, loaded,
    handleNewChat, handleSelectConversation, handleDeleteConversation, handleSend, handleStop,
  };
}
