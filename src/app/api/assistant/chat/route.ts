import { createTextStreamResponse, stepCountIs, streamText, toTextStream } from "ai";
import { getSession } from "@/lib/auth";
import { getAssistantConfig } from "@/lib/assistant";
import { z } from "@/lib/zod";
import {
  addMessage,
  createConversation,
  getConversation,
  listMessages,
} from "@/services/assistant";
import { getAssistantModel } from "@/services/assistant/provider";
import { buildAssistantSystemPrompt } from "@/services/assistant/prompt";
import { buildAssistantTools } from "@/services/assistant/tools";

const chatSchema = z.object({
  conversationId: z.uuid().nullish(),
  message: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getAssistantConfig();
  if (!config) {
    return Response.json({ error: "Assistant is disabled." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid message." }, { status: 400 });
  }

  const conversation = parsed.data.conversationId
    ? await getConversation(parsed.data.conversationId)
    : await createConversation(parsed.data.message);

  if (!conversation) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }

  await addMessage({
    conversationId: conversation.id,
    role: "user",
    content: parsed.data.message,
  });

  const history = await listMessages(conversation.id);
  const messages = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-20)
    .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));

  const result = streamText({
    model: getAssistantModel(config),
    system: buildAssistantSystemPrompt(),
    messages,
    tools: buildAssistantTools(conversation.id),
    stopWhen: stepCountIs(6),
    toolCallConcurrency: 1,
    onEnd: async (event) => {
      const text =
        event.text.trim() ||
        "I could not produce an answer from the available data. Try a narrower question or check that the data is imported.";
      const toolCalls = event.steps.flatMap((step) =>
        step.toolCalls.map((call) => call.toolName),
      );
      await addMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: text,
        metadata: { toolCalls: [...new Set(toolCalls)] },
      });
    },
    onError: ({ error }) => {
      console.error(
        "assistant provider error",
        error instanceof Error ? error.message : "unknown error",
      );
    },
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
    headers: {
      "x-conversation-id": conversation.id,
      "cache-control": "no-store",
    },
  });
}
