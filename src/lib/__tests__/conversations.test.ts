import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory store for localStorage mock
let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

// conversations.ts checks `typeof window === "undefined"` and accesses `localStorage` globally
Object.defineProperty(globalThis, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
  configurable: true,
});
// Also define localStorage as a global (conversations.ts uses it directly)
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

let loadConversations: typeof import("../conversations").loadConversations;
let saveConversations: typeof import("../conversations").saveConversations;

beforeEach(async () => {
  store = {};
  vi.clearAllMocks();
  const mod = await import("../conversations");
  loadConversations = mod.loadConversations;
  saveConversations = mod.saveConversations;
});

describe("loadConversations", () => {
  it("returns empty array when localStorage is empty", () => {
    const result = loadConversations();
    expect(result).toEqual([]);
  });

  it("returns parsed conversations from localStorage", () => {
    const conversations = [
      { id: "1", title: "Test", messages: [], createdAt: Date.now() },
    ];
    store["conversations"] = JSON.stringify(conversations);

    const result = loadConversations();
    expect(result).toEqual(conversations);
  });

  it("returns empty array for invalid JSON", () => {
    store["conversations"] = "not-json";

    const result = loadConversations();
    expect(result).toEqual([]);
  });

  it("returns empty array for non-array data", () => {
    store["conversations"] = JSON.stringify({ not: "array" });

    const result = loadConversations();
    expect(result).toEqual([]);
  });
});

describe("saveConversations", () => {
  it("saves conversations to localStorage", () => {
    const conversations = [
      { id: "1", title: "Test", messages: [], createdAt: Date.now() },
    ];
    saveConversations(conversations);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "conversations",
      JSON.stringify(conversations),
    );
  });

  it("truncates to MAX_CONVERSATIONS (100)", () => {
    const conversations = Array.from({ length: 150 }, (_, i) => ({
      id: String(i),
      title: `Conv ${i}`,
      messages: [],
      createdAt: Date.now(),
    }));
    saveConversations(conversations);

    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved).toHaveLength(100);
  });
});
