import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { investmentPriceCreateSchema } from "@/lib/schemas";
import { addPrice } from "@/services/investments";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, investmentPriceCreateSchema);
    const price = await addPrice(id, body);
    if (!price) throw new ApiError(404, "not_found", "Investment position not found");
    return jsonOk(price, 201);
  });
}
