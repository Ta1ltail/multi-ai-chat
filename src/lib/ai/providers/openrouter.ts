import type { AIProvider, StreamOptions } from "./types";

export const OPENROUTER_MODELS = [
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra (550B)",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super (120B)",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 262144,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 262144,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 262144,
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano (30B)",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 256000,
  },
] as const;

export const openrouterProvider: AIProvider = {
  id: "openrouter",
  name: "OpenRouter",

  async createStream(options: StreamOptions): Promise<ReadableStream> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not set in environment variables");
    }

    const apiMessages = [
      { role: "system" as const, content: options.systemPrompt },
      ...options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: apiMessages,
        stream: true,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.95,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }

    if (!response.body) {
      throw new Error("No response body from OpenRouter");
    }

    // Transform OpenRouter's SSE stream to our format
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";

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
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              let parsed: {
                choices?: Array<{ delta?: { content?: string | null } }>;
                error?: { message?: string };
              };
              try {
                parsed = JSON.parse(data);
              } catch {
                continue; // Skip malformed JSON lines
              }

              if (parsed.error) {
                throw new Error(parsed.error.message ?? "OpenRouter stream error");
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`),
                );
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("OpenRouter stream error:", error);
          const message = error instanceof Error ? error.message : "Stream failed";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
          controller.close();
        }
      },
    });
  },
};
