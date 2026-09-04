import type { ChatMessage, ProviderEvent } from "./types";

export function buildApiMessages(
  systemPrompt: string,
  messages: ChatMessage[],
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
  ];
}

const encoder = new TextEncoder();

/**
 * Encodes a ProviderEvent stream into the SSE wire format the client expects:
 * `data: {...}\n\n` for events and `data: [DONE]\n\n` for completion.
 */
export function toSSEStream(events: ReadableStream<ProviderEvent>): ReadableStream<Uint8Array> {
  let reader: ReadableStreamDefaultReader<ProviderEvent> | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      reader = events.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.type === "text") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: value.text })}\n\n`));
          } else if (value.type === "done") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } else if (value.type === "error") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: value.message })}\n\n`));
          }
        }
      } finally {
        reader.releaseLock();
        reader = null;
      }
      controller.close();
    },
    cancel() {
      // Client disconnected — stop pulling from the provider stream.
      reader?.cancel().catch(() => {});
    },
  });
}