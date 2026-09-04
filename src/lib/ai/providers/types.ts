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
  priority: number;
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
  signal?: AbortSignal;
}

/**
 * Structured stream events emitted by providers. The SSE wire format is
 * applied once, at the route boundary (see toSSEStream), so providers and
 * the fallback chain work with events rather than raw bytes.
 */
export type ProviderEvent =
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  createStream(options: StreamOptions): Promise<ReadableStream<ProviderEvent>>;
}
