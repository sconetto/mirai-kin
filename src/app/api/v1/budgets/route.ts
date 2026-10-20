import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { budgetCreateSchema } from "@/lib/schemas";
import { createBudget, listBudgetsWithSpend } from "@/services/budgets";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listBudgetsWithSpend());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, budgetCreateSchema);
    return withIdempotency(request, "budgets.create", body, async () => {
      const budget = await createBudget(body);
      return { status: 201, body: budget };
    });
  });
}
