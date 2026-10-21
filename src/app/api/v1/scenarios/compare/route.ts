import { assertApiToken } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/errors";
import { handle } from "@/lib/api/validate";
import { comparePlanScenarios } from "@/services/scenarios";

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await comparePlanScenarios());
  });
}
