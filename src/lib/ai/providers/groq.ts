import Groq from "groq-sdk";
import type { AIProvider, StreamOptions } from "./types";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

export const GROQ_MODELS = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
  },
  {
    id: "groq/compound",
    name: "Compound",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
  },
  {
    id: "groq/compound-mini",
    name: "Compound Mini",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
  },
] as const;

function buildSSEStream(stream: AsyncIterable<{ choices: Array<{ delta?: { content?: string | null } }> }>): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content != null) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Groq stream error:", error);
        const message = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        controller.close();
      }
    },
  });
}

export const groqProvider: AIProvider = {
  id: "groq",
  name: "Groq",

  async createStream(options: StreamOptions): Promise<ReadableStream> {
    const apiMessages = [
      { role: "system" as const, content: options.systemPrompt },
      ...options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const stream = await getGroq().chat.completions.create({
      model: options.model,
      messages: apiMessages,
      stream: true,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.95,
    });

    return buildSSEStream(stream);
  },
};
