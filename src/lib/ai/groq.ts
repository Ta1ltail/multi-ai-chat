import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const GROQ_MODEL = "openai/gpt-oss-120b";

export const SYSTEM_PROMPT = `You are a helpful AI assistant. Be concise, clear, and friendly. Use markdown formatting when it helps readability (like lists, code blocks, etc.). Keep responses focused and to the point.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Create a streaming chat completion and return a ReadableStream
 * in SSE format (data: {...}\n\n) for use in Next.js API routes.
 */
export async function createChatStream(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ReadableStream> {
  const apiMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: apiMessages,
    stream: true,
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.95,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        const message = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        controller.close();
      }
    },
  });
}
