import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { debtUpdateSchema } from "@/lib/schemas";
import { deleteDebt, getDebtWithSchedule, updateDebt } from "@/services/debts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const debt = await getDebtWithSchedule(id);
    if (!debt) throw new ApiError(404, "not_found", "Debt not found");
    return jsonOk(debt);
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, debtUpdateSchema);
    const debt = await updateDebt(id, body);
    if (!debt) throw new ApiError(404, "not_found", "Debt not found");
    return jsonOk(debt);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const debt = await deleteDebt(id);
    if (!debt) throw new ApiError(404, "not_found", "Debt not found");
    return jsonOk(debt);
  });
}
