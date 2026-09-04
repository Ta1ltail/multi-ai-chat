import type { Conversation, MessageData } from "@/types";

const STORAGE_KEY = "conversations";
const STORAGE_VERSION = 1;
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES_PER_CONVERSATION = 500;

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
    let items: unknown[];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.conversations)) {
      items = parsed.conversations;
    } else {
      return [];
    }
    return items.filter(isValidConversation) as Conversation[];
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

export interface SaveResult {
  ok: boolean;
  saved?: Conversation[];
}

export function saveConversations(conversations: Conversation[]): SaveResult {
  if (typeof window === "undefined") return { ok: true };
  const trimmed = conversations.slice(0, MAX_CONVERSATIONS).map((c) => ({
    ...c,
    messages: c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
  }));
  const data = { version: STORAGE_VERSION, conversations: trimmed };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch {
    try {
      const half = trimmed.slice(0, Math.floor(trimmed.length / 2));
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, conversations: half }),
      );
      return { ok: false, saved: half };
    } catch {
      return { ok: false };
    }
  }
}
