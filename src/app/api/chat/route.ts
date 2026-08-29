import { type NextRequest } from "next/server";
import {
  getProviderOrThrow,
  getModelById,
  getDefaultModel,
  SYSTEM_PROMPT,
  AUTO_MODEL_ID,
  getAvailableProviders,
  selectBestModel,
} from "@/lib/ai";

/** Maximum number of messages allowed per request. */
const MAX_MESSAGES = 100;
/** Maximum total content length (characters) across all messages. */
const MAX_TOTAL_CONTENT_LENGTH = 128_000;

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

function validateMessages(
  messages: unknown,
): { valid: false; error: string; status: number } | { valid: true; messages: Array<{ role: "user" | "assistant"; content: string }> } {
  if (!messages || !Array.isArray(messages)) {
    return { valid: false, error: "Messages array is required", status: 400 };
  }

  if (messages.length === 0) {
    return { valid: false, error: "Messages array must not be empty", status: 400 };
  }

  if (messages.length > MAX_MESSAGES) {
    return {
      valid: false,
      error: `Too many messages (maximum ${MAX_MESSAGES})`,
      status: 400,
    };
  }

  const validated: Array<{ role: "user" | "assistant"; content: string }> = [];
  let totalContentLength = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as IncomingMessage;

    if (typeof msg !== "object" || msg === null) {
      return { valid: false, error: `Message at index ${i} must be an object`, status: 400 };
    }

    if (msg.role !== "user" && msg.role !== "assistant") {
      return {
        valid: false,
        error: `Message at index ${i} has invalid role "${String(msg.role)}" (must be "user" or "assistant")`,
        status: 400,
      };
    }

    if (typeof msg.content !== "string" || msg.content.length === 0) {
      return {
        valid: false,
        error: `Message at index ${i} must have a non-empty string content`,
        status: 400,
      };
    }

    totalContentLength += msg.content.length;
    validated.push({ role: msg.role, content: msg.content });
  }

  if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Total message content too large (maximum ${MAX_TOTAL_CONTENT_LENGTH} characters)`,
      status: 400,
    };
  }

  return { valid: true, messages: validated };
}

export async function POST(req: NextRequest) {
  try {
    // Parse JSON in its own try/catch → 400 on malformed JSON
    let body: { messages?: unknown; provider?: string; model?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = validateMessages(body.messages);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: validation.status });
    }
    const messages = validation.messages;

    let resolvedModel: string;
    let resolvedProvider: string;

    if (body.model === AUTO_MODEL_ID) {
      const available = getAvailableProviders();
      const best = selectBestModel(available);
      resolvedModel = best.id;
      resolvedProvider = best.provider;
    } else {
      // Validate model ID against the registry (C-2)
      const modelId = body.model ?? getDefaultModel().id;
      const modelConfig = getModelById(modelId);

      if (!modelConfig) {
        return Response.json(
          { error: `Unknown model "${modelId}". Use "${AUTO_MODEL_ID}" or a valid model ID.` },
          { status: 400 },
        );
      }

      resolvedModel = modelConfig.id;
      // Resolve provider from registry, not from client input
      resolvedProvider = body.provider && modelConfig.provider === body.provider
        ? body.provider
        : modelConfig.provider;
    }

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
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("API route error:", error);

    // Map known error types to appropriate status codes
    const message = error instanceof Error ? error.message : "Internal server error";

    if (message.includes("No AI providers are configured")) {
      return Response.json({ error: message }, { status: 503 });
    }
    if (message.includes("Unknown provider")) {
      return Response.json({ error: message }, { status: 400 });
    }
    if (message.includes("API key") || message.includes("API error")) {
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
