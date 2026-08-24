import type { ModelConfig } from "./providers/types";
import { providerConfigs } from "./providers";

/** The special model ID that triggers auto-routing. */
export const AUTO_MODEL_ID = "auto";

const allModels: ModelConfig[] = providerConfigs.flatMap((p) => p.models) as ModelConfig[];

/**
 * Check which providers have API keys configured.
 * Runs server-side only (accesses process.env).
 */
export function getAvailableProviders(): string[] {
  const available: string[] = [];
  if (process.env.GROQ_API_KEY) available.push("groq");
  if (process.env.OPENROUTER_API_KEY) available.push("openrouter");
  return available;
}

/**
 * Select the best model from available providers.
 * Sorts by priority (descending), then by context length (descending) as tiebreaker.
 * Throws if no providers are configured.
 */
export function selectBestModel(availableProviders: string[]): ModelConfig {
  const candidates = allModels.filter((m) => availableProviders.includes(m.provider));

  if (candidates.length === 0) {
    throw new Error(
      "No AI providers are configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in .env.local",
    );
  }

  // Sort: highest priority first, then largest context length as tiebreaker
  candidates.sort((a, b) => b.priority - a.priority || b.contextLength - a.contextLength);

  return candidates[0];
}
