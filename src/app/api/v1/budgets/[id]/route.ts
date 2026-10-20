import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { budgetUpdateSchema } from "@/lib/schemas";
import { deleteBudget, getBudget, updateBudget } from "@/services/budgets";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const budget = await getBudget(id);
    if (!budget) throw new ApiError(404, "not_found", "Budget not found");
    return jsonOk(budget);
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, budgetUpdateSchema);
    const budget = await updateBudget(id, body);
    if (!budget) throw new ApiError(404, "not_found", "Budget not found");
    return jsonOk(budget);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const budget = await deleteBudget(id);
    if (!budget) throw new ApiError(404, "not_found", "Budget not found");
    return jsonOk(budget);
  });
}
