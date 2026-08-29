import { describe, it, expect, beforeEach } from "vitest";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
});

import { getAvailableProviders, selectBestModel } from "../ai/router";
import { AUTO_MODEL_ID } from "../ai/models";

describe("AUTO_MODEL_ID", () => {
  it("equals \"auto\"", () => {
    expect(AUTO_MODEL_ID).toBe("auto");
  });
});

describe("getAvailableProviders", () => {
  it("returns empty array when no API keys are set", () => {
    expect(getAvailableProviders()).toEqual([]);
  });

  it("detects Groq when GROQ_API_KEY is set", () => {
    process.env.GROQ_API_KEY = "test-key";
    expect(getAvailableProviders()).toContain("groq");
  });

  it("detects OpenRouter when OPENROUTER_API_KEY is set", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    expect(getAvailableProviders()).toContain("openrouter");
  });

  it("detects both providers when both keys are set", () => {
    process.env.GROQ_API_KEY = "test-key";
    process.env.OPENROUTER_API_KEY = "test-key";
    const providers = getAvailableProviders();
    expect(providers).toContain("groq");
    expect(providers).toContain("openrouter");
    expect(providers).toHaveLength(2);
  });
});

describe("selectBestModel", () => {
  it("throws when no providers are available", () => {
    expect(() => selectBestModel([])).toThrow("No AI providers are configured");
  });

  it("throws when available providers have no matching models", () => {
    expect(() => selectBestModel(["nonexistent"])).toThrow("No AI providers are configured");
  });

  it("selects the highest priority Groq model", () => {
    const best = selectBestModel(["groq"]);
    expect(best.provider).toBe("groq");
    expect(best.id).toBe("openai/gpt-oss-120b");
  });

  it("selects the highest priority OpenRouter model", () => {
    const best = selectBestModel(["openrouter"]);
    expect(best.provider).toBe("openrouter");
    expect(best.id).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
  });

  it("prefers Groq over OpenRouter when both available (higher priority)", () => {
    const best = selectBestModel(["groq", "openrouter"]);
    expect(best.provider).toBe("groq");
    expect(best.priority).toBeGreaterThanOrEqual(90);
  });

  it("returns a valid ModelConfig with all required fields", () => {
    const best = selectBestModel(["groq"]);
    expect(best).toHaveProperty("id");
    expect(best).toHaveProperty("name");
    expect(best).toHaveProperty("provider");
    expect(best).toHaveProperty("maxTokens");
    expect(best).toHaveProperty("contextLength");
    expect(best).toHaveProperty("priority");
  });
});
