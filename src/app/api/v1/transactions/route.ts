import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson, parseQuery } from "@/lib/api/validate";
import { transactionBatchSchema, transactionQuerySchema } from "@/lib/schemas";
import { createTransactions, listTransactions } from "@/services/transactions";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const query = parseQuery(request, transactionQuerySchema);
    return jsonOk(await listTransactions(query));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, transactionBatchSchema);
    return withIdempotency(request, "transactions.create", body, async () => {
      const result = await createTransactions(body.transactions);
      return { status: 201, body: result };
    });
  });
}
