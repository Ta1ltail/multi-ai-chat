import type { AIProvider, ModelConfig, ProviderConfig } from "./types";
import { groqProvider, GROQ_MODELS } from "./groq";
import { openrouterProvider, OPENROUTER_MODELS } from "./openrouter";

export type { AIProvider, ModelConfig, ProviderConfig, StreamOptions } from "./types";

const providers: Record<string, AIProvider> = {
  groq: groqProvider,
  openrouter: openrouterProvider,
};

const allModels: ModelConfig[] = [...GROQ_MODELS, ...OPENROUTER_MODELS] as ModelConfig[];

export const providerConfigs: ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    models: GROQ_MODELS,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: OPENROUTER_MODELS,
  },
];

export function getProviderOrThrow(id: string): AIProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Unknown provider: ${id}. Available: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}

export function getModelById(modelId: string): ModelConfig | undefined {
  return allModels.find((m) => m.id === modelId);
}

export function getDefaultModel(): ModelConfig {
  return GROQ_MODELS[0];
}
