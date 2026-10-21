import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { AssistantConfig } from "@/lib/assistant";

export function getAssistantModel(config: AssistantConfig): LanguageModel {
  const provider = createOpenAICompatible({
    name: config.provider,
    baseURL: config.baseUrl,
    apiKey: config.apiKey ?? "local",
    includeUsage: true,
  });

  return provider(config.model);
}
