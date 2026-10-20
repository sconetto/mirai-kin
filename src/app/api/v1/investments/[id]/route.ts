import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { investmentPositionUpdateSchema } from "@/lib/schemas";
import { deletePosition, getPosition, updatePosition } from "@/services/investments";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, investmentPositionUpdateSchema);
    const position = await updatePosition(id, body);
    if (!position) throw new ApiError(404, "not_found", "Investment position not found");
    return jsonOk(position);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const position = await deletePosition(id);
    if (!position) throw new ApiError(404, "not_found", "Investment position not found");
    return jsonOk(position);
  });
}

export async function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const position = await getPosition(id);
    if (!position) throw new ApiError(404, "not_found", "Investment position not found");
    return jsonOk(position);
  });
}
