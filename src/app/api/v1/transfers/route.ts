import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { transferCreateSchema } from "@/lib/schemas";
import { createTransfer, listTransfers } from "@/services/transfers";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listTransfers());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, transferCreateSchema);
    return withIdempotency(request, "transfers.create", body, async () => {
      const result = await createTransfer(body);
      return { status: 201, body: result };
    });
  });
}
