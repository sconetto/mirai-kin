import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { labelCreateSchema } from "@/lib/schemas";
import { createLabel, listLabels } from "@/services/labels";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listLabels());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, labelCreateSchema);
    return withIdempotency(request, "labels.create", body, async () => {
      const label = await createLabel(body);
      return { status: 201, body: label };
    });
  });
}
