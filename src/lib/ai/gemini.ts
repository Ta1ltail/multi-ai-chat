import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");

export interface ChatMessage {
  role: "user" | "model";
  parts: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant. Be concise, clear, and friendly. Use markdown formatting when it helps readability (like lists, code blocks, etc.).`;

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
): Promise<void> {
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'll be a helpful, concise assistant." }],
      },
      ...messages.slice(0, -1).map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.parts }],
      })),
    ],
  });

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    callbacks.onError(new Error("No messages provided"));
    return;
  }

  try {
    const result = await chat.sendMessageStream(lastMessage.parts);
    let fullText = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      callbacks.onChunk(text);
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
