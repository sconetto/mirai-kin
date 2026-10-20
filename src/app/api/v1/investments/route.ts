import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { investmentPositionCreateSchema } from "@/lib/schemas";
import { createPosition, listPositionsWithValue } from "@/services/investments";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listPositionsWithValue());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, investmentPositionCreateSchema);
    return withIdempotency(request, "investments.create", body, async () => {
      const position = await createPosition(body);
      return { status: 201, body: position };
    });
  });
}
