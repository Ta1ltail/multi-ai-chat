import { describe, it, expect } from "vitest";
import { readSSEStream } from "../sse";

/**
 * Helper: build a minimal Response with a ReadableStream body
 * that yields encoded SSE text lines.
 */
function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

describe("readSSEStream", () => {
  it("calls onEvent for each text event", async () => {
    const events: string[] = [];
    const response = sseResponse(['data: {"text":"hello"}\n\n', 'data: {"text":"world"}\n\n']);

    await readSSEStream(
      response,
      (event) => {
        if (event.text) events.push(event.text);
      },
      () => {},
    );

    expect(events).toEqual(["hello", "world"]);
  });

  it("calls onDone when stream ends", async () => {
    let doneCalled = false;
    const response = sseResponse(['data: {"text":"hi"}\n\n', "data: [DONE]\n\n"]);

    await readSSEStream(
      response,
      () => {},
      () => {
        doneCalled = true;
      },
    );

    expect(doneCalled).toBe(true);
  });

  it("throws when server sends an error event", async () => {
    const response = sseResponse(['data: {"error":"Provider is down"}\n\n']);

    await expect(
      readSSEStream(
        response,
        () => {},
        () => {},
      ),
    ).rejects.toThrow("Provider is down");
  });

  it("skips malformed JSON lines without throwing", async () => {
    const events: string[] = [];
    const response = sseResponse(["data: {not json}\n\n", 'data: {"text":"valid"}\n\n']);

    await readSSEStream(
      response,
      (event) => {
        if (event.text) events.push(event.text);
      },
      () => {},
    );

    expect(events).toEqual(["valid"]);
  });

  it("ignores lines without 'data: ' prefix", async () => {
    const events: string[] = [];
    const response = sseResponse(["event: ping\n\n", 'data: {"text":"ok"}\n\n', ": heartbeat\n\n"]);

    await readSSEStream(
      response,
      (event) => {
        if (event.text) events.push(event.text);
      },
      () => {},
    );

    expect(events).toEqual(["ok"]);
  });

  it("skips [DONE] marker without calling onEvent", async () => {
    const events: string[] = [];
    let doneCalled = false;
    const response = sseResponse([
      'data: {"text":"before"}\n\n',
      "data: [DONE]\n\n",
      'data: {"text":"after"}\n\n',
    ]);

    await readSSEStream(
      response,
      (event) => {
        if (event.text) events.push(event.text);
      },
      () => {
        doneCalled = true;
      },
    );

    expect(events).toEqual(["before", "after"]);
    expect(doneCalled).toBe(true);
  });

  it("handles chunks that split across buffer boundaries", async () => {
    const events: string[] = [];
    const encoder = new TextEncoder();
    // Split the JSON across two chunks
    const chunk1 = encoder.encode('data: {"text":');
    const chunk2 = encoder.encode('"hello"}\n\n');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });
    const response = new Response(stream);

    await readSSEStream(
      response,
      (event) => {
        if (event.text) events.push(event.text);
      },
      () => {},
    );

    expect(events).toEqual(["hello"]);
  });

  it("throws when response has no body", async () => {
    const response = new Response(null);

    await expect(
      readSSEStream(
        response,
        () => {},
        () => {},
      ),
    ).rejects.toThrow("No reader available");
  });
});
