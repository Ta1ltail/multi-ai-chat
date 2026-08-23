export {
  type AIProvider,
  type ModelConfig,
  type ProviderConfig,
  type StreamOptions,
  providerConfigs,
  getProviderOrThrow,
  getModelById,
  getDefaultModel,
} from "./providers";

export const SYSTEM_PROMPT = `You are a helpful AI assistant. Be concise, clear, and friendly. Use markdown formatting when it helps readability (like lists, code blocks, etc.). Keep responses focused and to the point.`;
