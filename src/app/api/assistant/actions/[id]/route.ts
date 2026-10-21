import { getSession } from "@/lib/auth";
import { z } from "@/lib/zod";
import { cancelAssistantAction, confirmAssistantAction } from "@/services/assistant";

const decisionSchema = z.object({
  decision: z.enum(["confirm", "cancel"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid decision." }, { status: 400 });
  }

  if (parsed.data.decision === "cancel") {
    const action = await cancelAssistantAction(id);
    if (!action) {
      return Response.json(
        { ok: false, error: "This action is no longer pending." },
        { status: 409 },
      );
    }
    return Response.json({ ok: true });
  }

  const result = await confirmAssistantAction(id);
  if (!result.ok) {
    return Response.json(result, { status: 409 });
  }
  return Response.json(result);
}
