import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import {
  planTrajectory,
  projectAssetClassTrajectory,
  projectPlanTrajectory,
  resolvePlanAssumptions,
} from "./projections";

const RATES = {
  cash: 0.03,
  investments: 0.08,
  real_estate: 0.05,
  vehicles: -0.12,
  other_appreciating: 0.03,
  other_depreciating: 0.03,
  liabilities: 0,
};

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
      assetClassRates: RATES,
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

describe("projectAssetClassTrajectory", () => {
  const base = {
    baseCurrency: "BRL",
    asOf: "2026-01-15",
    expectedReturn: 0.08,
    inflation: 0.03,
    monthlyContribution: 0,
    horizonMonths: 12,
  };

  it("keeps cash flat in real terms", () => {
    const result = projectAssetClassTrajectory({
      ...base,
      components: [{ assetClass: "cash", value: 1000 }],
    });
    expect(result.points.at(-1)?.base).toBeCloseTo(1000, 2);
    expect(result.assumptions.assetClassRates.cash).toBeCloseTo(0.03);
  });

  it("grows investments and real estate while depreciating vehicles", () => {
    const investments = projectAssetClassTrajectory({
      ...base,
      components: [{ assetClass: "investments", value: 1000 }],
    });
    const realEstate = projectAssetClassTrajectory({
      ...base,
      components: [{ assetClass: "real_estate", value: 1000 }],
    });
    const vehicles = projectAssetClassTrajectory({
      ...base,
      components: [{ assetClass: "vehicles", value: 1000 }],
    });

    expect(investments.points.at(-1)?.base).toBeGreaterThan(1000);
    expect(realEstate.points.at(-1)?.base).toBeGreaterThan(1000);
    expect(vehicles.points.at(-1)?.base).toBeLessThan(1000);
    expect(vehicles.assumptions.assetClassRates.vehicles).toBeCloseTo(-0.12);
  });

  it("keeps liabilities flat", () => {
    const result = projectAssetClassTrajectory({
      ...base,
      components: [
        { assetClass: "cash", value: 1000 },
        { assetClass: "liabilities", value: 200 },
      ],
    });
    expect(result.points[0]?.base).toBeCloseTo(800, 2);
    expect(result.points.at(-1)?.base).toBeCloseTo(800, 2);
  });

  it("adds contributions to financial assets", () => {
    const result = projectAssetClassTrajectory({
      ...base,
      monthlyContribution: 100,
      components: [
        { assetClass: "cash", value: 1000 },
        { assetClass: "investments", value: 0 },
      ],
    });
    expect(result.points.at(-1)?.base).toBeGreaterThan(result.points[0]?.base ?? 0);
  });

  it("uses per-component growth overrides", () => {
    const result = projectAssetClassTrajectory({
      ...base,
      components: [{ assetClass: "cash", value: 1000, growthRate: -0.1 }],
    });
    expect(result.points.at(-1)?.base).toBeLessThan(1000);
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
