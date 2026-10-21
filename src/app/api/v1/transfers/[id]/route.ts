import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle } from "@/lib/api/validate";
import { unpairTransfer } from "@/services/transfers";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    try {
      return jsonOk(await unpairTransfer(id));
    } catch (error) {
      if (error instanceof Error && error.name === "TransferValidationError") {
        throw new ApiError(404, "not_found", error.message);
      }
      throw error;
    }
  });
}
