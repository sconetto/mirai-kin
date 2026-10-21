import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import {
  planTrajectory,
  projectPlanTrajectory,
  resolvePlanAssumptions,
} from "./projections";

const INPUT = {
  netWorth: 100_000,
  baseCurrency: "BRL",
  asOf: "2026-01-15",
  expectedReturn: 0.06,
  inflation: 0.03,
  monthlyContribution: 1_000,
  horizonMonths: 24,
};

describe("projectPlanTrajectory", () => {
  it("is reproducible for identical inputs", () => {
    const first = projectPlanTrajectory(INPUT);
    const second = projectPlanTrajectory(INPUT);
    expect(second).toEqual(first);
  });

  it("returns effective assumptions and the requested horizon", () => {
    const result = projectPlanTrajectory(INPUT);
    expect(result.assumptions).toMatchObject({
      expectedReturn: 0.06,
      inflation: 0.03,
      monthlyContribution: 1_000,
      horizonMonths: 24,
    });
    expect(result.points).toHaveLength(25);
    expect(result.points[0]?.base).toBe(100_000);
    expect(result.points.at(-1)?.base).toBeGreaterThan(result.points[0]?.base ?? 0);
  });

  it("inherits unset assumptions and keeps explicit overrides", () => {
    const base = {
      expectedReturn: 0.05,
      inflation: 0.03,
      monthlyContribution: 1_000,
      returnBand: 0.1,
      horizonMonths: 120,
    };
    expect(resolvePlanAssumptions(base, { expectedReturn: 0.09 }, 24)).toEqual({
      ...base,
      expectedReturn: 0.09,
      horizonMonths: 24,
    });
    expect(
      resolvePlanAssumptions(
        base,
        { inflation: 0.04, monthlyContribution: 500, horizonMonths: 240 },
        24,
      ),
    ).toEqual({
      ...base,
      inflation: 0.04,
      monthlyContribution: 500,
      horizonMonths: 240,
    });
  });
});

describe.skipIf(!process.env.DATABASE_URL)("planTrajectory overrides", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("uses a horizon override for the trajectory length", async () => {
    const asOf = new Date("2026-01-15T00:00:00.000Z");
    const result = await planTrajectory(24, asOf, { horizonMonths: 36 });
    expect(result.assumptions.horizonMonths).toBe(36);
    expect(result.points).toHaveLength(37);
  });
});
