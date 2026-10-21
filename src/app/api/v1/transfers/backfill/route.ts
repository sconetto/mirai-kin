import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { handle } from "@/lib/api/validate";
import { backfillTransfers } from "@/services/transfers";

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await backfillTransfers());
  });
}
