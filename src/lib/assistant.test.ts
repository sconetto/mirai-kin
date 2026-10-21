import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAssistantConfig } from "./assistant";

const KEYS = [
  "ASSISTANT_ENABLED",
  "ASSISTANT_PROVIDER",
  "ASSISTANT_MODEL",
  "ASSISTANT_API_KEY",
  "ASSISTANT_BASE_URL",
];

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("getAssistantConfig", () => {
  it("is disabled by default", () => {
    expect(getAssistantConfig()).toBeNull();
  });

  it("requires an explicit true flag", () => {
    process.env.ASSISTANT_ENABLED = "TRUE";
    process.env.ASSISTANT_MODEL = "test-model";
    process.env.ASSISTANT_BASE_URL = "https://example.com/v1";
    process.env.ASSISTANT_API_KEY = "test-key";
    expect(getAssistantConfig()).toBeNull();
  });

  it("requires a model and a base URL", () => {
    process.env.ASSISTANT_ENABLED = "true";
    expect(getAssistantConfig()).toBeNull();

    process.env.ASSISTANT_MODEL = "test-model";
    expect(getAssistantConfig()).toBeNull();
  });

  it("accepts an OpenAI endpoint with a key", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_PROVIDER = "openai";
    process.env.ASSISTANT_MODEL = "test-model";
    process.env.ASSISTANT_API_KEY = "test-key";

    const config = getAssistantConfig();
    expect(config?.baseUrl).toBe("https://api.openai.com/v1");
    expect(config?.local).toBe(false);
  });

  it("requires a key for remote compatible endpoints", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_MODEL = "test-model";
    process.env.ASSISTANT_BASE_URL = "https://example.com/v1";
    expect(getAssistantConfig()).toBeNull();
  });

  it("accepts a local endpoint without a key", () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.ASSISTANT_MODEL = "llama3.1";
    process.env.ASSISTANT_BASE_URL = "http://localhost:11434/v1";

    const config = getAssistantConfig();
    expect(config?.local).toBe(true);
    expect(config?.baseUrl).toBe("http://localhost:11434/v1");
  });
});
