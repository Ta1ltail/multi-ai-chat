import type { AIProvider, ProviderEvent, StreamOptions } from "./types";
import { buildApiMessages } from "./shared";

export const openrouterProvider: AIProvider = {
  id: "openrouter",
  name: "OpenRouter",

  async createStream(options: StreamOptions): Promise<ReadableStream<ProviderEvent>> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

    const timeoutSignal = AbortSignal.timeout(60_000);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: options.model, messages: buildApiMessages(options.systemPrompt, options.messages), stream: true,
        max_tokens: options.maxTokens ?? 2048, temperature: options.temperature ?? 0.7, top_p: options.topP ?? 0.95,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }
    if (!response.body) throw new Error("No response body from OpenRouter");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<ProviderEvent>({
      async start(controller) {
        try {
          let buffer = "";
          let doneSent = false;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") {
                controller.enqueue({ type: "done" });
                doneSent = true;
                continue;
              }
              let parsed: { choices?: Array<{ delta?: { content?: string | null } }>; error?: { message?: string } };
              try { parsed = JSON.parse(data); } catch { continue; }
              if (parsed.error) throw new Error(parsed.error.message ?? "OpenRouter stream error");
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) controller.enqueue({ type: "text", text: content });
            }
          }
          if (!doneSent) controller.enqueue({ type: "done" });
          controller.close();
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            controller.close();
            return;
          }
          console.error("OpenRouter stream error:", error);
          const message = error instanceof Error ? error.message : "Stream failed";
          controller.enqueue({ type: "error", message });
          controller.close();
        }
      },
      cancel() { reader.cancel().catch(() => {}); },
    });
  },
};