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

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  createStream(options: StreamOptions): Promise<ReadableStream>;
}
