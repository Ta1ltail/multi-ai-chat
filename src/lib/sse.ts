export interface SSEEvent {
  text?: string;
  error?: string;
}

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
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        let parsed: SSEEvent;
        try {
          parsed = JSON.parse(data) as SSEEvent;
        } catch {
          continue;
        }
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) onEvent(parsed);
      }
    }

    // Flush remaining buffer (last line without trailing newline)
    if (buffer.startsWith("data: ")) {
      const data = buffer.slice(6);
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data) as SSEEvent;
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) onEvent(parsed);
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone();
}
