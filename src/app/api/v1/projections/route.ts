import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { handle, parseQuery } from "@/lib/api/validate";
import { projectionQuerySchema } from "@/lib/schemas";
import { forecast } from "@/services/projections";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const query = parseQuery(request, projectionQuerySchema);
    return jsonOk(await forecast(query.horizonMonths ?? 12));
  });
}
