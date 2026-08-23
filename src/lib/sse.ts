/**
 * Client-side SSE stream reader.
 * Reads a fetch Response body as SSE and calls callbacks for each event.
 */

export interface SSEEvent {
  text?: string;
  error?: string;
}

/**
 * Read a fetch Response as an SSE stream.
 * Calls `onEvent` for each parsed event and `onDone` when the stream ends.
 * Returns a cleanup function to abort the reader.
 */
export async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  onDone: () => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as SSEEvent;
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) onEvent(parsed);
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone();
}
