import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { handle, parseJson } from "@/lib/api/validate";
import { transferPairSchema } from "@/lib/schemas";
import { pairTransactions } from "@/services/transfers";

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, transferPairSchema);
    try {
      const transfer = await pairTransactions(body.firstId, body.secondId);
      return jsonOk(transfer, 201);
    } catch (error) {
      if (error instanceof Error && error.name === "TransferValidationError") {
        throw new ApiError(400, "invalid_transfer", error.message);
      }
      throw error;
    }
  });
}
