/**
 * localStorage persistence for conversations.
 * Handles read/write errors gracefully and enforces a storage limit.
 */

const STORAGE_KEY = "conversations";
const MAX_CONVERSATIONS = 100;

export interface PersistedConversation {
  id: string;
  title: string;
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  createdAt: number;
}

export function loadConversations(): PersistedConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    // Corrupted data — clear and start fresh
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return [];
  }
}

export function saveConversations(conversations: PersistedConversation[]): void {
  if (typeof window === "undefined") return;
  try {
    // Enforce limit — keep most recent
    const trimmed = conversations.slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — try removing oldest conversations
    try {
      const trimmed = conversations.slice(0, Math.floor(conversations.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Still full — nothing we can do silently
      console.warn("Could not save conversations: storage full");
    }
  }
}
