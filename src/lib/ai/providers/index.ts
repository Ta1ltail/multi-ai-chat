import type { AIProvider } from "./types";
import { groqProvider } from "./groq";
import { openrouterProvider } from "./openrouter";

export type { AIProvider, ModelConfig, ProviderConfig, StreamOptions } from "./types";

const providers: Record<string, AIProvider> = {
  groq: groqProvider,
  openrouter: openrouterProvider,
};

export function getProviderOrThrow(id: string): AIProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Unknown provider: ${id}. Available: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}
