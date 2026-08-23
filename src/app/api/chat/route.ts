import { type NextRequest } from "next/server";
import { createChatStream } from "@/lib/ai/groq";

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages array is required" }, { status: 400 });
    }

    const stream = await createChatStream(messages);

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
