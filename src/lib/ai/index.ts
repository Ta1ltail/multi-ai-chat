import "server-only";

export {
  type AIProvider,
  type ProviderEvent,
  type StreamOptions,
  getProviderOrThrow,
  toSSEStream,
} from "./providers";

export {
  type ModelConfig,
  type ProviderConfig,
  allModels,
  providerConfigs,
  getModelById,
  getDefaultModel,
  AUTO_MODEL_ID,
  GROQ_MODELS,
  OPENROUTER_MODELS,
} from "./models";

export { getAvailableProviders, selectBestModel, buildFallbackCandidates } from "./router";

export { createStreamWithFallback } from "./fallback";

export const SYSTEM_PROMPT = `You are a helpful AI assistant. Be concise, clear, and friendly. Use markdown formatting when it helps readability (lists, code blocks, tables, blockquotes). When a longer answer needs structure, use real heading levels: '# ' for the main title only, '## ' for top-level sections, and '### ' for subsections — prefer '## ' for section headers instead of repeating '### '. Avoid headings entirely for short answers; lead with the key point instead. Keep paragraphs short with blank lines between them and use **bold** sparingly.`;
