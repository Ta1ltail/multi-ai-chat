/**
 * localStorage persistence for conversations.
 * Handles read/write errors gracefully and enforces a storage limit.
 */

import type { Conversation, MessageData } from "@/types";

const STORAGE_KEY = "conversations";
const STORAGE_VERSION = 1;
const MAX_CONVERSATIONS = 100;

interface StoredData {
  version?: number;
  conversations?: Conversation[];
}

function isValidMessage(item: unknown): item is MessageData {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    (obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string"
  );
}

function isValidConversation(item: unknown): item is Conversation {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.createdAt === "number" &&
    Array.isArray(obj.messages) &&
    obj.messages.every(isValidMessage)
  );
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: StoredData | Conversation[] = JSON.parse(raw);

    // Handle legacy format (plain array, no version)
    let items: unknown[];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.conversations)) {
      items = parsed.conversations;
    } else {
      return [];
    }

    // Validate each item, filter out corrupt ones
    const valid = items.filter(isValidConversation) as Conversation[];
    return valid;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  const data = { version: STORAGE_VERSION, conversations: conversations.slice(0, MAX_CONVERSATIONS) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    try {
      const trimmed = data.conversations.slice(0, Math.floor(data.conversations.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, conversations: trimmed }));
    } catch {
      console.warn("Could not save conversations: storage full");
    }
  }
}
