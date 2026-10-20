import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { labelUpdateSchema } from "@/lib/schemas";
import { deleteLabel, updateLabel } from "@/services/labels";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, labelUpdateSchema);
    if (!body.name) throw new ApiError(400, "validation_error", "Name is required");
    const label = await updateLabel(id, body.name);
    if (!label) throw new ApiError(404, "not_found", "Label not found");
    return jsonOk(label);
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const label = await deleteLabel(id);
    if (!label) throw new ApiError(404, "not_found", "Label not found");
    return jsonOk(label);
  });
}
