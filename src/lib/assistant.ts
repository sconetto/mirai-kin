export type AssistantConfig = {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey?: string;
  local: boolean;
};

function isLocalEndpoint(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch {
    return false;
  }
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * The assistant is disabled unless it is explicitly enabled and a usable
 * provider endpoint/model is configured. The API key never leaves the server.
 */
export function getAssistantConfig(): AssistantConfig | null {
  if (process.env.ASSISTANT_ENABLED !== "true") return null;

  const model = process.env.ASSISTANT_MODEL?.trim();
  if (!model) return null;

  const provider = process.env.ASSISTANT_PROVIDER?.trim() || "openai-compatible";
  const configuredBaseUrl = process.env.ASSISTANT_BASE_URL?.trim();
  const baseUrl =
    configuredBaseUrl || (provider === "openai" ? "https://api.openai.com/v1" : "");
  if (!baseUrl || !validUrl(baseUrl)) return null;

  const apiKey = process.env.ASSISTANT_API_KEY?.trim() || undefined;
  const local = isLocalEndpoint(baseUrl);
  if (!apiKey && !local) return null;

  return { provider, model, baseUrl, apiKey, local };
}

export function isAssistantEnabled(): boolean {
  return getAssistantConfig() !== null;
}
