import { type NextRequest } from "next/server";
import { getProviderOrThrow, getDefaultModel, SYSTEM_PROMPT } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { messages, provider, model } = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      provider?: string;
      model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages array is required" }, { status: 400 });
    }

    const resolvedModel = model ?? getDefaultModel().id;
    const resolvedProvider = provider ?? getDefaultModel().provider;

    const aiProvider = getProviderOrThrow(resolvedProvider);

    const stream = await aiProvider.createStream({
      model: resolvedModel,
      messages,
      systemPrompt: SYSTEM_PROMPT,
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
