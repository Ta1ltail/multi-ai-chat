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

  it("returns parsed conversations from versioned format", () => {
    const conversations = [
      { id: "1", title: "Test", messages: [], createdAt: Date.now() },
    ];
    store["conversations"] = JSON.stringify({ version: 1, conversations });

    const result = loadConversations();
    expect(result).toEqual(conversations);
  });

  it("returns parsed conversations from legacy plain array format", () => {
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

  it("returns empty array for non-array, non-versioned data", () => {
    store["conversations"] = JSON.stringify({ not: "array" });

    const result = loadConversations();
    expect(result).toEqual([]);
  });

  it("filters out conversations with missing required fields", () => {
    const conversations = [
      { id: "1", title: "Good", messages: [], createdAt: Date.now() },
      { title: "No ID", messages: [], createdAt: Date.now() }, // missing id
      { id: "3", title: "No messages field", createdAt: Date.now() }, // missing messages
      "not an object",
    ];
    store["conversations"] = JSON.stringify({ version: 1, conversations });

    const result = loadConversations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters out conversations with invalid message items", () => {
    const conversations = [
      {
        id: "1",
        title: "Mixed messages",
        createdAt: Date.now(),
        messages: [
          { id: "m1", role: "user", content: "hello" }, // valid
          { id: "m2", role: "assistant", content: "hi" }, // valid
          { id: "m3", role: "user" }, // missing content — invalid
          { content: "orphan" }, // missing id and role — invalid
        ],
      },
    ];
    store["conversations"] = JSON.stringify({ version: 1, conversations });

    const result = loadConversations();
    // The whole conversation is invalid because messages[2] and messages[3] fail
    expect(result).toHaveLength(0);
  });
});

describe("saveConversations", () => {
  it("saves versioned conversations to localStorage", () => {
    const conversations = [
      { id: "1", title: "Test", messages: [], createdAt: Date.now() },
    ];
    saveConversations(conversations);

    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(saved.version).toBe(1);
    expect(saved.conversations).toEqual(conversations);
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
    expect(saved.conversations).toHaveLength(100);
  });
});
