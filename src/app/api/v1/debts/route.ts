import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { debtCreateSchema } from "@/lib/schemas";
import { createDebt, listDebts } from "@/services/debts";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listDebts());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, debtCreateSchema);
    return withIdempotency(request, "debts.create", body, async () => {
      const debt = await createDebt(body);
      return { status: 201, body: debt };
    });
  });
}
