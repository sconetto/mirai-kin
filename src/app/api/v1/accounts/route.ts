import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { accountCreateSchema } from "@/lib/schemas";
import { createAccount, listAccounts } from "@/services/accounts";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listAccounts(true));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, accountCreateSchema);
    return withIdempotency(request, "accounts.create", body, async () => {
      const account = await createAccount(body);
      return { status: 201, body: account };
    });
  });
}
