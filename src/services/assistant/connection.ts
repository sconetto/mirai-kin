import { resolveAssistantConfig } from "@/services/settings";

export type AssistantConnectionResult = {
  ok: boolean;
  message: string;
  status?: number;
};

/**
 * Checks that the configured OpenAI-compatible endpoint is reachable and, when
 * a key is configured, that it is accepted. This endpoint receives no user
 * financial data.
 */
export async function testAssistantConnection(): Promise<AssistantConnectionResult> {
  const config = await resolveAssistantConfig();
  if (!config) {
    return { ok: false, message: "The assistant is disabled or not fully configured." };
  }

  const url = `${config.baseUrl.replace(/\/+$/, "")}/models`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: `The provider returned HTTP ${response.status}.`,
      };
    }
    return { ok: true, status: response.status, message: "The provider responded successfully." };
  } catch {
    return { ok: false, message: "The provider could not be reached." };
  }
}
