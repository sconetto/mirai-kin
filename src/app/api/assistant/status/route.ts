import { getSession } from "@/lib/auth";
import { resolveAssistantConfig } from "@/services/settings";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await resolveAssistantConfig();
  return Response.json({
    enabled: config !== null,
    provider: config?.provider ?? null,
    model: config?.model ?? null,
    baseUrl: config?.baseUrl ?? null,
    local: config?.local ?? null,
    envEnabled: process.env.ASSISTANT_ENABLED ?? null,
    envModel: process.env.ASSISTANT_MODEL ?? null,
    envBaseUrl: process.env.ASSISTANT_BASE_URL ?? null,
  });
}
