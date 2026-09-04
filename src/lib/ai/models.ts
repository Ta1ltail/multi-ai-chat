import type { ModelConfig, ProviderConfig } from "./providers/types";

export type { ModelConfig, ProviderConfig };

export const GROQ_MODELS = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
    priority: 90,
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
    priority: 70,
  },
  {
    id: "groq/compound",
    name: "Compound",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
    priority: 60,
  },
  {
    id: "groq/compound-mini",
    name: "Compound Mini",
    provider: "groq",
    maxTokens: 2048,
    contextLength: 131072,
    priority: 50,
  },
] as const;

export const OPENROUTER_MODELS = [
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra (550B)",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 1000000,
    priority: 80,
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super (120B)",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 262144,
    priority: 75,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 262144,
    priority: 65,
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 262144,
    priority: 55,
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano (30B)",
    provider: "openrouter",
    maxTokens: 2048,
    contextLength: 256000,
    priority: 40,
  },
] as const;

export const AUTO_MODEL_ID = "auto";

export const allModels: ModelConfig[] = [...GROQ_MODELS, ...OPENROUTER_MODELS] as ModelConfig[];

export const providerConfigs: ProviderConfig[] = [
  { id: "groq", name: "Groq", models: GROQ_MODELS },
  { id: "openrouter", name: "OpenRouter", models: OPENROUTER_MODELS },
];

export function getModelById(modelId: string): ModelConfig | undefined {
  return allModels.find((m) => m.id === modelId);
}

export function getDefaultModel(): ModelConfig {
  return GROQ_MODELS[0];
}
