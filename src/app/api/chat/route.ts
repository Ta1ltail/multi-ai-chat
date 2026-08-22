import { type NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");

const SYSTEM_PROMPT = `You are a helpful AI assistant. Be concise, clear, and friendly. Use markdown formatting when it helps readability (like lists, code blocks, etc.). Keep responses focused and to the point.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "model"; parts: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages array is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build history: skip the last message (it's the current user message)
    const historyMessages = messages.slice(0, -1);
    const lastMessage = messages[messages.length - 1];

    const chat = model.startChat({
      history: historyMessages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.parts }],
      })),
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await chat.sendMessageStream(lastMessage.parts);

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
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

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
