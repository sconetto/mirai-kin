import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { recurringTransactionCreateSchema } from "@/lib/schemas";
import { createRecurring, listRecurring } from "@/services/projections";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listRecurring());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, recurringTransactionCreateSchema);
    return withIdempotency(request, "recurring.create", body, async () => {
      const recurring = await createRecurring(body);
      return { status: 201, body: recurring };
    });
  });
}
