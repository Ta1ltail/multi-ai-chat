import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStreamWithFallback } from "../ai/fallback";
import { buildFallbackCandidates } from "../ai/router";
import type { AIProvider, ModelConfig, ProviderEvent } from "../ai/providers/types";

function eventStream(events: ProviderEvent[]): ReadableStream<ProviderEvent> {
  return new ReadableStream<ProviderEvent>({
    start(controller) {
      for (const e of events) controller.enqueue(e);
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<ProviderEvent>): Promise<ProviderEvent[]> {
  const events: ProviderEvent[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    events.push(value);
  }
  reader.releaseLock();
  return events;
}

function makeModel(id: string, provider: string, priority: number): ModelConfig {
  return { id, name: id, provider, maxTokens: 100, contextLength: 1000, priority };
}

const m1 = makeModel("model-1", "p1", 10);
const m2 = makeModel("model-2", "p2", 20);

describe("buildFallbackCandidates", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it("puts the preferred model first", () => {
    process.env.GROQ_API_KEY = "key";
    const preferred = { ...m1, provider: "groq" };
    const candidates = buildFallbackCandidates(preferred, ["groq"]);
    expect(candidates[0].id).toBe(preferred.id);
  });

  it("only includes models from available providers", () => {
    process.env.GROQ_API_KEY = "key";
    const preferred = { ...m1, provider: "openrouter" }; // openrouter NOT available
    const candidates = buildFallbackCandidates(preferred, ["groq"]);
    expect(candidates[0].id).toBe(preferred.id);
    expect(candidates.every((m) => m.id === preferred.id || m.provider === "groq")).toBe(true);
  });

  it("orders the rest by priority descending", () => {
    process.env.GROQ_API_KEY = "key";
    const preferred = { ...m1, provider: "groq" };
    const candidates = buildFallbackCandidates(preferred, ["groq"]);
    const rest = candidates.slice(1);
    for (let i = 1; i < rest.length; i++) {
      expect(rest[i - 1].priority).toBeGreaterThanOrEqual(rest[i].priority);
    }
  });

  it("does not duplicate the preferred model", () => {
    process.env.GROQ_API_KEY = "key";
    const preferred = { ...m1, provider: "groq" };
    const candidates = buildFallbackCandidates(preferred, ["groq"]);
    expect(candidates.filter((m) => m.id === preferred.id)).toHaveLength(1);
  });

  it("returns only the preferred model when no providers are available", () => {
    const preferred = m1;
    const candidates = buildFallbackCandidates(preferred, []);
    expect(candidates).toEqual([preferred]);
  });
});

describe("createStreamWithFallback", () => {
  const baseOptions = { messages: [], systemPrompt: "" };

  it("streams text and done from the first candidate", async () => {
    const p1: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => eventStream([{ type: "text", text: "hi" }, { type: "done" }])),
    };
    const providers: Record<string, AIProvider> = { p1 };
    const stream = await createStreamWithFallback([m1], baseOptions, (id) => providers[id]);
    expect(await collect(stream)).toEqual([{ type: "text", text: "hi" }, { type: "done" }]);
  });

  it("falls back when the first candidate fails to start", async () => {
    const p1: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => { throw new Error("API error (401)"); }),
    };
    const p2: AIProvider = {
      id: "p2", name: "p2",
      createStream: vi.fn(async () => eventStream([{ type: "text", text: "from p2" }, { type: "done" }])),
    };
    const providers: Record<string, AIProvider> = { p1, p2 };
    const stream = await createStreamWithFallback([m1, m2], baseOptions, (id) => providers[id]);
    expect(await collect(stream)).toEqual([{ type: "text", text: "from p2" }, { type: "done" }]);
  });

  it("rejects when all candidates fail to start", async () => {
    const failing: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => { throw new Error("API key invalid"); }),
    };
    const providers: Record<string, AIProvider> = { p1: failing, p2: failing };
    await expect(
      createStreamWithFallback([m1, m2], baseOptions, (id) => providers[id]),
    ).rejects.toThrow("All providers failed");
  });

  it("switches mid-stream when a candidate errors before emitting content", async () => {
    const p1: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => eventStream([{ type: "error", message: "Provider is down" }])),
    };
    const p2: AIProvider = {
      id: "p2", name: "p2",
      createStream: vi.fn(async () => eventStream([{ type: "text", text: "recovered" }, { type: "done" }])),
    };
    const providers: Record<string, AIProvider> = { p1, p2 };
    const stream = await createStreamWithFallback([m1, m2], baseOptions, (id) => providers[id]);
    expect(await collect(stream)).toEqual([{ type: "text", text: "recovered" }, { type: "done" }]);
  });

  it("propagates the error (no fallback) once content was already emitted", async () => {
    const p1: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => eventStream([{ type: "text", text: "partial" }, { type: "error", message: "mid failure" }])),
    };
    const p2: AIProvider = {
      id: "p2", name: "p2",
      createStream: vi.fn(async () => eventStream([{ type: "text", text: "never used" }, { type: "done" }])),
    };
    const providers: Record<string, AIProvider> = { p1, p2 };
    const stream = await createStreamWithFallback([m1, m2], baseOptions, (id) => providers[id]);
    expect(await collect(stream)).toEqual([{ type: "text", text: "partial" }, { type: "error", message: "mid failure" }]);
    expect(providers.p2.createStream).not.toHaveBeenCalled();
  });

  it("emits the error when the last candidate fails mid-stream", async () => {
    const p1: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => eventStream([{ type: "error", message: "only failure" }])),
    };
    const providers: Record<string, AIProvider> = { p1 };
    const stream = await createStreamWithFallback([m1], baseOptions, (id) => providers[id]);
    expect(await collect(stream)).toEqual([{ type: "error", message: "model-1: only failure" }]);
  });

  it("treats a clean stream end without a done event as completion", async () => {
    const p1: AIProvider = {
      id: "p1", name: "p1",
      createStream: vi.fn(async () => eventStream([{ type: "text", text: "no done marker" }])),
    };
    const providers: Record<string, AIProvider> = { p1 };
    const stream = await createStreamWithFallback([m1], baseOptions, (id) => providers[id]);
    expect(await collect(stream)).toEqual([{ type: "text", text: "no done marker" }, { type: "done" }]);
  });
});