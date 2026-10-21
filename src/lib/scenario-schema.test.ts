import { describe, expect, it } from "vitest";
import { scenarioAssumptionsSchema, scenarioCreateSchema } from "./schemas";

describe("scenario schemas", () => {
  it("accepts partial assumptions for inheritance", () => {
    const result = scenarioAssumptionsSchema.safeParse({ expectedReturn: 0.07 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ expectedReturn: 0.07 });
  });

  it("reports the invalid horizon field", () => {
    const result = scenarioAssumptionsSchema.safeParse({ horizonMonths: 5 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["horizonMonths"]);
  });

  it("validates the scenario name and payload", () => {
    expect(scenarioCreateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(scenarioCreateSchema.safeParse({ name: "Retire early" }).success).toBe(true);
  });
});
