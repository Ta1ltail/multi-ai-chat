export interface ProviderConfig {
  id: string;
  name: string;
  models: readonly ModelConfig[];
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  contextLength: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  model: string;
  messages: ChatMessage[];
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Every provider must implement this interface.
 * The API route calls `createStream` and returns the ReadableStream to the client.
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  createStream(options: StreamOptions): Promise<ReadableStream>;
}
