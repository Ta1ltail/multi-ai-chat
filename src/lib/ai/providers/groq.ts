import Groq from "groq-sdk";
import type { AIProvider, ProviderEvent, StreamOptions } from "./types";
import { buildApiMessages } from "./shared";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

function buildEventStream(
  stream: AsyncIterable<{ choices: Array<{ delta?: { content?: string | null } }> }>,
  signal?: AbortSignal,
): ReadableStream<ProviderEvent> {
  return new ReadableStream<ProviderEvent>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (signal?.aborted) break;
          const content = chunk.choices[0]?.delta?.content;
          if (content != null) {
            controller.enqueue({ type: "text", text: content });
          }
        }
        if (!signal?.aborted) {
          controller.enqueue({ type: "done" });
        }
        controller.close();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          controller.close();
          return;
        }
        console.error("Groq stream error:", error);
        const message = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue({ type: "error", message });
        controller.close();
      }
    },
    cancel() {
      /* Groq AsyncIterable cleanup is GC-driven */
    },
  });
}

export const groqProvider: AIProvider = {
  id: "groq",
  name: "Groq",

  async createStream(options: StreamOptions): Promise<ReadableStream<ProviderEvent>> {
    const stream = await getGroq().chat.completions.create({
      model: options.model,
      messages: buildApiMessages(options.systemPrompt, options.messages),
      stream: true,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
    });

    return buildEventStream(stream, options.signal);
  },
};
