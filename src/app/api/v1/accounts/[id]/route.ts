import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { accountUpdateSchema } from "@/lib/schemas";
import { deleteAccount, getAccount, updateAccount } from "@/services/accounts";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const account = await getAccount(id);
    if (!account) throw new ApiError(404, "not_found", "Account not found");
    return jsonOk(account);
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, accountUpdateSchema);
    const account = await updateAccount(id, body);
    if (!account) throw new ApiError(404, "not_found", "Account not found");
    return jsonOk(account);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const account = await deleteAccount(id);
    if (!account) throw new ApiError(404, "not_found", "Account not found");
    return jsonOk(account);
  });
}
