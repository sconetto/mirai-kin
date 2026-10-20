import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { getCachedResponse, requestHash, storeResponse } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { csvImportSchema } from "@/lib/schemas";
import { importCsv } from "@/services/csv";

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, csvImportSchema);
    const key = request.headers.get("idempotency-key") ?? body.idempotencyKey ?? null;

    if (key) {
      const cached = await getCachedResponse(key, "import.csv");
      if (cached) {
        return Response.json(cached.response, { status: cached.statusCode });
      }
    }

    const result = await importCsv(body.csv, { accountId: body.accountId });

    if (key) {
      await storeResponse(key, "import.csv", requestHash(body), 200, result);
    }

    return jsonOk(result);
  });
}
