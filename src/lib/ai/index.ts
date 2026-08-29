import "server-only";

export { type AIProvider, type StreamOptions, getProviderOrThrow } from "./providers";

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

export { getAvailableProviders, selectBestModel } from "./router";

export const SYSTEM_PROMPT = `You are a helpful AI assistant. Be concise, clear, and friendly. Use markdown formatting when it helps readability (like lists, code blocks, etc.). Keep responses focused and to the point.`;
