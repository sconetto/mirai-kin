import { assertApiToken } from "@/lib/api/auth";
import { ApiError, jsonOk } from "@/lib/api/errors";
import { withIdempotency } from "@/lib/api/idempotency";
import { handle, parseJson } from "@/lib/api/validate";
import { scenarioUpdateSchema } from "@/lib/schemas";
import {
  deleteScenario,
  getScenario,
  ScenarioValidationError,
  updateScenario,
} from "@/services/scenarios";

type Ctx = { params: Promise<{ id: string }> };

function scenarioError(error: unknown): never {
  if (error instanceof ScenarioValidationError) {
    throw new ApiError(400, "validation_error", error.message, error.fields);
  }
  throw error;
}

export async function GET(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const scenario = await getScenario(id);
    if (!scenario) throw new ApiError(404, "not_found", "Scenario not found");
    return jsonOk(scenario);
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const body = await parseJson(request, scenarioUpdateSchema);
    try {
      return await withIdempotency(request, "scenarios.update", { id, body }, async () => {
        const scenario = await updateScenario(id, body);
        if (!scenario) throw new ApiError(404, "not_found", "Scenario not found");
        return { status: 200, body: scenario };
      });
    } catch (error) {
      scenarioError(error);
    }
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return handle(async () => {
    assertApiToken(request);
    const { id } = await ctx.params;
    const replacementDefaultId =
      new URL(request.url).searchParams.get("replacementDefaultId") ?? undefined;
    try {
      const scenario = await deleteScenario(id, replacementDefaultId);
      if (!scenario) throw new ApiError(404, "not_found", "Scenario not found");
      return jsonOk(scenario);
    } catch (error) {
      scenarioError(error);
    }
  });
}
