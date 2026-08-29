import type { ModelConfig } from "./providers/types";
import { allModels } from "./models";

export function getAvailableProviders(): string[] {
  const available: string[] = [];
  if (process.env.GROQ_API_KEY) available.push("groq");
  if (process.env.OPENROUTER_API_KEY) available.push("openrouter");
  return available;
}

export function selectBestModel(availableProviders: string[]): ModelConfig {
  const candidates = allModels.filter((m) => availableProviders.includes(m.provider));

  if (candidates.length === 0) {
    throw new Error(
      "No AI providers are configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in .env.local",
    );
  }

  candidates.sort((a, b) => b.priority - a.priority || b.contextLength - a.contextLength);
  return candidates[0];
}
