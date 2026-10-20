import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { transactionUpdateSchema } from "@/lib/schemas";
import { deleteTransaction, getTransaction, updateTransaction } from "@/services/transactions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const transaction = await getTransaction(id);
    if (!transaction) throw new ApiError(404, "not_found", "Transaction not found");
    return jsonOk(transaction);
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, transactionUpdateSchema);
    const transaction = await updateTransaction(id, body);
    if (!transaction) throw new ApiError(404, "not_found", "Transaction not found");
    return jsonOk(transaction);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const transaction = await deleteTransaction(id);
    if (!transaction) throw new ApiError(404, "not_found", "Transaction not found");
    return jsonOk(transaction);
  });
}
