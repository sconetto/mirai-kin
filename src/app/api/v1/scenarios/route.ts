import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { scenarioCreateSchema } from "@/lib/schemas";
import {
  createScenario,
  listScenarios,
  ScenarioValidationError,
} from "@/services/scenarios";

function scenarioError(error: unknown): never {
  if (error instanceof ScenarioValidationError) {
    throw new ApiError(400, "validation_error", error.message, error.fields);
  }
  throw error;
}

export async function GET(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    return jsonOk(await listScenarios());
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    assertApiToken(request);
    const body = await parseJson(request, scenarioCreateSchema);
    try {
      return await withIdempotency(request, "scenarios.create", body, async () => {
        const scenario = await createScenario(body);
        return { status: 201, body: scenario };
      });
    } catch (error) {
      scenarioError(error);
    }
  });
}
