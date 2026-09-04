import { describe, it, expect } from "vitest";
import { buildApiMessages, toSSEStream } from "../ai/providers/shared";
import type { ProviderEvent } from "../ai/providers/types";

describe("buildApiMessages", () => {
  it("prepends the system prompt", () => {
    const result = buildApiMessages("be helpful", [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
    expect(result).toEqual([
      { role: "system", content: "be helpful" },
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
  });

  it("works with no messages", () => {
    expect(buildApiMessages("sys", [])).toEqual([{ role: "system", content: "sys" }]);
  });
});

describe("toSSEStream", () => {
  async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out += new TextDecoder().decode(value);
    }
    reader.releaseLock();
    return out;
  }

  function eventStream(events: ProviderEvent[]): ReadableStream<ProviderEvent> {
    return new ReadableStream<ProviderEvent>({
      start(controller) {
        for (const e of events) controller.enqueue(e);
        controller.close();
      },
    });
  }

  it("encodes text events as SSE data lines", async () => {
    const out = await collect(toSSEStream(eventStream([{ type: "text", text: "hello" }])));
    expect(out).toBe('data: {"text":"hello"}\n\n');
  });

  it("encodes the done event as the [DONE] marker", async () => {
    const out = await collect(toSSEStream(eventStream([{ type: "done" }])));
    expect(out).toBe("data: [DONE]\n\n");
  });

  it("encodes error events as SSE data lines", async () => {
    const out = await collect(toSSEStream(eventStream([{ type: "error", message: "boom" }])));
    expect(out).toBe('data: {"error":"boom"}\n\n');
  });

  it("emits a complete SSE sequence for a full response", async () => {
    const out = await collect(
      toSSEStream(eventStream([
        { type: "text", text: "part 1" },
        { type: "text", text: " part 2" },
        { type: "done" },
      ])),
    );
    expect(out).toBe('data: {"text":"part 1"}\n\ndata: {"text":" part 2"}\n\ndata: [DONE]\n\n');
  });

  it("closes cleanly on an empty stream", async () => {
    const out = await collect(toSSEStream(eventStream([])));
    expect(out).toBe("");
  });
});